// ============================================================
// useGameSounds.ts — Système de sons « banque de fichiers ».
// L'utilisateur dépose ses propres mp3/ogg dans public/sounds/
// et un manifest.json {"cle":"fichier.mp3"} les mappe. AUCUN son
// procédural, AUCUNE dépendance npm. Tout échec (manifest absent,
// fichier manquant, autoplay bloqué) est 100% silencieux.
//
// Les sons sont déclenchés par DÉTECTION DE TRANSITION du GameState
// (reducer pur) : on compare l'état courant à l'état précédent via
// un useRef, et on joue le son correspondant à chaque transition.
//
// Préférences (volume/mute) : persistées dans localStorage et
// partagées avec SoundControls via l'événement DOM 'www-sound-prefs'.
// ============================================================

import { useEffect, useRef } from 'react'
import { assetUrl } from '../game/assets'
import type { GameState } from '../game/types'

// ---------- Clés de sons supportées ----------

/** Toutes les clés attendues dans public/sounds/manifest.json. */
export const SOUND_KEYS = [
  'dice_roll', // entrée en phase ROLLING
  'step', // chaque saut du pion pendant MOVING
  'coins', // fx STEAL_COINS
  'star_steal', // fx STEAL_STAR
  'roulette', // entrée en MINIGAME_CATEGORY ou MINIGAME_TITLE
  'podium', // entrée en phase PODIUM
  'rewards', // entrée en phase REWARDS
  'turn', // entrée en phase TURN_START
  'wall', // pending devient WALL_PROMPT
  'gameover', // entrée en phase GAME_OVER
  'cursed', // événement DOM 'www-cursed-now'
] as const

export type SoundKey = (typeof SOUND_KEYS)[number]

// ---------- Préférences (volume / mute) ----------

const VOLUME_KEY = 'www-sound-volume'
const MUTED_KEY = 'www-sound-muted'
const PREFS_EVENT = 'www-sound-prefs'
const DEFAULT_VOLUME = 0.7

export interface SoundPrefs {
  /** 0..1 */
  volume: number
  muted: boolean
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, n))
}

/** Lit les préférences persistées (défaut volume 0.7, non muet). */
export function getSoundPrefs(): SoundPrefs {
  let volume = DEFAULT_VOLUME
  let muted = false
  try {
    const v = localStorage.getItem(VOLUME_KEY)
    if (v !== null) volume = clamp01(Number(v))
    muted = localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    // localStorage indisponible → valeurs par défaut
  }
  return { volume, muted }
}

/**
 * Met à jour les préférences (patch partiel), persiste dans
 * localStorage et notifie tous les abonnés via 'www-sound-prefs'.
 */
export function setSoundPrefs(patch: Partial<SoundPrefs>): SoundPrefs {
  const current = getSoundPrefs()
  const next: SoundPrefs = {
    volume: patch.volume !== undefined ? clamp01(patch.volume) : current.volume,
    muted: patch.muted !== undefined ? patch.muted : current.muted,
  }
  try {
    localStorage.setItem(VOLUME_KEY, String(next.volume))
    localStorage.setItem(MUTED_KEY, next.muted ? '1' : '0')
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent<SoundPrefs>(PREFS_EVENT, { detail: next }))
  } catch {
    // ignore
  }
  return next
}

/** S'abonne aux changements de préférences. Retourne un désabonnement. */
export function onSoundPrefsChange(cb: (prefs: SoundPrefs) => void): () => void {
  const handler = () => cb(getSoundPrefs())
  window.addEventListener(PREFS_EVENT, handler)
  return () => window.removeEventListener(PREFS_EVENT, handler)
}

// ---------- Le hook ----------

/**
 * Branche la banque de sons sur le GameState. À appeler une seule
 * fois, haut dans l'arbre (ex. dans App, à côté du provider).
 */
export function useGameSounds(state: GameState): void {
  // Banque préchargée : clé → élément audio « modèle ».
  const bankRef = useRef<Record<string, HTMLAudioElement>>({})
  // Préférences courantes, lues à chaque play (réactives).
  const prefsRef = useRef<SoundPrefs>(getSoundPrefs())
  // Déblocage autoplay : tant que false, on ne tente rien d'audible.
  const unlockedRef = useRef(false)
  // État précédent pour la détection de transitions.
  const prevRef = useRef<GameState | null>(null)

  // --- Chargement du manifest + préchargement (au montage) ---
  useEffect(() => {
    let cancelled = false
    fetch(assetUrl('/sounds/manifest.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (cancelled || !data || typeof data !== 'object') return
        const map = data as Record<string, unknown>
        const bank: Record<string, HTMLAudioElement> = {}
        for (const key of Object.keys(map)) {
          const file = map[key]
          if (typeof file !== 'string' || file.length === 0) continue
          const audio = new Audio()
          audio.preload = 'auto'
          audio.src = assetUrl('/sounds/' + file.replace(/^\//, ''))
          bank[key] = audio
        }
        bankRef.current = bank
      })
      .catch(() => {
        // manifest absent → silence total, c'est voulu
      })
    return () => {
      cancelled = true
    }
  }, [])

  // --- Abonnement aux préférences (volume / mute) ---
  useEffect(() => onSoundPrefsChange((p) => (prefsRef.current = p)), [])

  // --- Déblocage autoplay au premier pointerdown ---
  useEffect(() => {
    const unlock = () => {
      unlockedRef.current = true
      // Réveille le contexte audio par un play muet immédiatement résolu.
      for (const audio of Object.values(bankRef.current)) {
        const probe = audio.cloneNode(true) as HTMLAudioElement
        probe.muted = true
        probe.volume = 0
        const p = probe.play()
        if (p && typeof p.then === 'function') {
          p.then(() => probe.pause()).catch(() => {})
        }
      }
      window.removeEventListener('pointerdown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // --- Lecteur : clone le modèle pour autoriser les chevauchements ---
  const play = (key: SoundKey) => {
    const prefs = prefsRef.current
    if (prefs.muted || prefs.volume <= 0) return
    const model = bankRef.current[key]
    if (!model) return
    try {
      const node = model.cloneNode(true) as HTMLAudioElement
      node.volume = prefs.volume
      const p = node.play()
      if (p && typeof p.then === 'function') p.catch(() => {})
    } catch {
      // ignore
    }
  }

  // --- Détection de transitions ---
  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = state
    if (!prev) return // premier rendu : on ne joue rien

    // dice_roll : entrée en ROLLING
    if (state.phase === 'ROLLING' && prev.phase !== 'ROLLING') play('dice_roll')

    // turn : entrée en TURN_START
    if (state.phase === 'TURN_START' && prev.phase !== 'TURN_START') play('turn')

    // roulette : entrée en MINIGAME_CATEGORY ou MINIGAME_TITLE
    const rouletteNow = state.phase === 'MINIGAME_CATEGORY' || state.phase === 'MINIGAME_TITLE'
    const roulettePrev = prev.phase === 'MINIGAME_CATEGORY' || prev.phase === 'MINIGAME_TITLE'
    if (rouletteNow && !roulettePrev) play('roulette')

    // podium : entrée en PODIUM
    if (state.phase === 'PODIUM' && prev.phase !== 'PODIUM') play('podium')

    // rewards : entrée en REWARDS
    if (state.phase === 'REWARDS' && prev.phase !== 'REWARDS') play('rewards')

    // gameover : entrée en GAME_OVER
    if (state.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') play('gameover')

    // step : pendant MOVING, à chaque changement de movement.hopTo non nul
    const hopNow = state.movement?.hopTo ?? null
    const hopPrev = prev.movement?.hopTo ?? null
    if (state.phase === 'MOVING' && hopNow !== null && hopNow !== hopPrev) play('step')

    // coins / star_steal : fx.id change selon le kind
    const fxNow = state.fx
    const fxPrev = prev.fx
    if (fxNow && fxNow.id !== (fxPrev?.id ?? -1)) {
      if (fxNow.kind === 'STEAL_COINS') play('coins')
      else if (fxNow.kind === 'STEAL_STAR') play('star_steal')
    }

    // wall : pending passe à WALL_PROMPT
    if (state.pending?.kind === 'WALL_PROMPT' && prev.pending?.kind !== 'WALL_PROMPT') play('wall')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // --- cursed : événement DOM, indépendant du GameState ---
  useEffect(() => {
    const onCursed = () => play('cursed')
    window.addEventListener('www-cursed-now', onCursed)
    return () => window.removeEventListener('www-cursed-now', onCursed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
