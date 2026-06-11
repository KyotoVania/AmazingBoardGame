// ============================================================
// autosave.ts — Sauvegarde automatique dans localStorage.
// Chaque action de jeu persiste l'état complet (il est 100%
// sérialisable : les modèles GLB vivent hors state). Au boot,
// l'app propose de reprendre la partie interrompue.
// ============================================================

import type { GameState } from './types'

const STORAGE_KEY = 'woody-woods-autosave'
/** À incrémenter si le schéma de GameState casse la compatibilité. */
const SAVE_VERSION = 1

export interface SavedGame {
  version: number
  savedAt: number
  state: GameState
}

/** Persiste l'état (hors lobby). Efface la save en fin de partie. */
export function autosave(state: GameState): void {
  try {
    if (state.phase === 'LOBBY') return
    if (state.phase === 'GAME_OVER') {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    const payload: SavedGame = { version: SAVE_VERSION, savedAt: Date.now(), state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // stockage plein ou indisponible : on joue sans filet, tant pis
  }
}

/** Relit la save si elle existe et que la version est compatible. */
export function readAutosave(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedGame
    if (parsed.version !== SAVE_VERSION || !parsed.state?.players?.length) return null
    return parsed
  } catch {
    return null
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* rien à faire */
  }
}
