// ============================================================
// portraitOverrides.ts — Permet de REMPLACER le portrait d'un
// personnage de dialogue (EventPopup) par une image custom :
//   · soit un chemin de la BANQUE (public/images/characters/…),
//   · soit une dataURL issue d'un upload local.
// Persistance dans localStorage ('www-portraits'), hors GameState.
// Réactivité simple via un événement DOM 'www-portraits-changed'
// et le hook usePortraitUrl(id).
// ============================================================

import { useSyncExternalStore } from 'react'
import { assetUrl } from './assets'
import { EVENT_CHARACTERS, type EventCharacterId } from './eventImages'

const STORAGE_KEY = 'www-portraits'
const CHANGED_EVENT = 'www-portraits-changed'

/** Une entrée de la banque de portraits (public/images/characters/manifest.json). */
export interface PortraitBankEntry {
  name: string
  file: string
}

type Overrides = Partial<Record<EventCharacterId, string>>

/** Lit les overrides persistés (échec silencieux → {}). */
function read(): Overrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Overrides) : {}
  } catch {
    return {}
  }
}

/** Écrit les overrides et notifie les abonnés. */
function write(next: Overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // quota / mode privé : on ignore, l'état mémoire reste cohérent
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGED_EVENT))
  }
}

/**
 * URL du portrait à afficher pour un personnage :
 * override utilisateur s'il existe, sinon imageUrl par défaut du registre.
 */
export function getPortraitUrl(id: EventCharacterId): string | null {
  const override = read()[id]
  if (override) return override
  return EVENT_CHARACTERS[id]?.imageUrl ?? null
}

/**
 * Définit (ou réinitialise) l'override d'un personnage.
 * url = chemin banque OU dataURL ; null = reset (repli sur le défaut).
 */
export function setPortraitOverride(id: EventCharacterId, url: string | null) {
  const current = read()
  if (url) current[id] = url
  else delete current[id]
  write(current)
}

/**
 * Charge la banque de portraits depuis le manifest public (optionnel).
 * Échec silencieux → []. Les chemins sont préfixés via assetUrl().
 */
export async function loadPortraitBank(): Promise<PortraitBankEntry[]> {
  try {
    const res = await fetch(assetUrl('/images/characters/manifest.json'))
    if (!res.ok) return []
    const list: unknown = await res.json()
    if (!Array.isArray(list)) return []
    return list
      .filter(
        (e): e is PortraitBankEntry =>
          !!e && typeof e.name === 'string' && typeof e.file === 'string',
      )
      .map((e) => ({ name: e.name, file: assetUrl(e.file) }))
  } catch {
    return []
  }
}

// ---------- Réactivité (hook) ----------

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGED_EVENT, callback)
  // Synchronise aussi entre onglets.
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGED_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/**
 * Hook réactif : renvoie l'URL du portrait courant pour un personnage,
 * et se met à jour automatiquement quand l'override change.
 */
export function usePortraitUrl(id: EventCharacterId): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getPortraitUrl(id),
    () => getPortraitUrl(id),
  )
}
