// ============================================================
// CursedOverlay.tsx — L'ÉVÉNEMENT CURSED : toutes les N minutes
// (config ⚙️, 0 = off), une image/GIF tirée au sort dans
// public/images/cursed/ envahit l'écran ~7 s avec secousses,
// flash, glitch et une consigne trash hurlée par-dessus.
// Banque : public/images/cursed/manifest.json = ["fichier.gif", …]
// Déclenchement manuel : window event 'www-cursed-now' (debug).
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { pickNarrative } from '../../game/eventNarratives'
import { useGame } from '../../game/useGameState'

const DISPLAY_MS = 7000

interface CursedHit {
  id: number
  src: string
  text: string
}

export function CursedOverlay() {
  const { state } = useGame()
  const [bank, setBank] = useState<string[]>([])
  const [hit, setHit] = useState<CursedHit | null>(null)
  const seq = useRef(0)
  const bankRef = useRef<string[]>([])
  bankRef.current = bank

  // Banque d'images cursed (manifest optionnel, échec silencieux)
  useEffect(() => {
    fetch('/images/cursed/manifest.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => {
        if (Array.isArray(list)) {
          setBank(
            list
              .filter((f): f is string => typeof f === 'string')
              .map((f) => (f.startsWith('/') ? f : `/images/cursed/${f}`)),
          )
        }
      })
      .catch(() => {})
  }, [])

  const summon = () => {
    const pool = bankRef.current
    if (pool.length === 0) return
    setHit({
      id: seq.current++,
      src: pool[Math.floor(Math.random() * pool.length)],
      text: pickNarrative('CURSED'),
    })
    window.setTimeout(() => setHit(null), DISPLAY_MS)
  }

  // Timer périodique — uniquement en partie, intervalle configurable
  const inGame = state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER'
  const intervalMin = state.config.cursedIntervalMin
  useEffect(() => {
    if (!inGame || intervalMin <= 0) return
    const t = window.setInterval(summon, intervalMin * 60_000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inGame, intervalMin])

  // Déclencheur manuel (bouton God Mode)
  useEffect(() => {
    const onNow = () => summon()
    window.addEventListener('www-cursed-now', onNow)
    return () => window.removeEventListener('www-cursed-now', onNow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence>
      {hit && (
        <motion.div
          key={hit.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.3, filter: 'blur(8px)' }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
        >
          {/* fond strobo */}
          <motion.div
            animate={{ backgroundColor: ['#000000ee', '#3b0a0aee', '#000000ee', '#0a2a0bee', '#000000ee'] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            className="absolute inset-0"
          />
          {/* l'image cursed, secouée et zoomée */}
          <motion.img
            src={hit.src}
            alt="???"
            initial={{ scale: 0.2, rotate: -20 }}
            animate={{
              scale: [0.2, 1.15, 0.96, 1.08, 1],
              rotate: [-20, 6, -4, 2, 0],
              x: [0, -14, 12, -8, 6, 0],
              y: [0, 9, -7, 5, 0],
            }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 max-h-[70vh] max-w-[80vw] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_0_60px_rgba(255,0,60,0.7)]"
          />
          {/* doubles fantômes glitch */}
          <motion.img
            src={hit.src}
            alt=""
            animate={{ opacity: [0, 0.35, 0, 0.25, 0], x: [-30, 24, -18, 12], scaleX: [1, -1, 1, -1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 max-h-[70vh] max-w-[80vw] -translate-x-1/2 -translate-y-1/2 object-contain opacity-30 mix-blend-screen hue-rotate-90"
          />
          {/* la consigne hurlée */}
          <motion.p
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1, scale: [1, 1.04, 1] }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200, scale: { duration: 0.5, repeat: Infinity } }}
            className="font-display absolute bottom-[8%] left-1/2 w-full max-w-4xl -translate-x-1/2 px-8 text-center text-4xl tracking-wide text-red-300 drop-shadow-[0_4px_0_rgba(0,0,0,0.8)]"
          >
            {hit.text}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
