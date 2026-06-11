// ============================================================
// ResumeBanner.tsx — Au lobby, si une autosave existe : propose
// de reprendre la partie interrompue (crash, fermeture, etc.).
// ============================================================

import { motion } from 'framer-motion'
import { useState } from 'react'
import { clearAutosave, readAutosave, type SavedGame } from '../../game/autosave'
import { useGame } from '../../game/useGameState'

function ago(ts: number): string {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000))
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  return `il y a ${h} h ${min % 60} min`
}

export function ResumeBanner() {
  const { loadState } = useGame()
  const [saved, setSaved] = useState<SavedGame | null>(() => readAutosave())
  if (!saved) return null

  const st = saved.state
  const current = st.players[st.currentPlayerIndex]

  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="absolute top-4 left-1/2 z-40 w-full max-w-xl -translate-x-1/2 px-4"
    >
      <div className="bg-night-900/95 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl ring-4 ring-emerald-400/50 backdrop-blur-md">
        <span className="text-3xl">💾</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Partie en cours retrouvée !</p>
          <p className="text-cream/60 text-xs font-bold">
            Manche {st.round}/{st.maxRounds} · au tour de{' '}
            <span style={{ color: current?.color }}>{current?.name}</span> · sauvegardée{' '}
            {ago(saved.savedAt)}
          </p>
        </div>
        <button
          onClick={() => loadState(st)}
          className="from-gold-400 to-gold-500 text-night-950 rounded-xl bg-gradient-to-b px-4 py-2 text-sm font-extrabold"
        >
          ▶️ REPRENDRE
        </button>
        <button
          onClick={() => {
            clearAutosave()
            setSaved(null)
          }}
          title="Supprimer la sauvegarde"
          className="bg-night-800 text-cream/70 hover:bg-night-700 rounded-xl px-3 py-2 text-sm font-extrabold"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  )
}
