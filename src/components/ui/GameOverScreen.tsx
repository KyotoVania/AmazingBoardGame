// ============================================================
// GameOverScreen.tsx — Classement final (étoiles puis pièces),
// statistiques gorgées et bouton rejouer.
// ============================================================

import { motion } from 'framer-motion'
import { CHARACTERS } from '../../game/constants'
import { useGame } from '../../game/useGameState'

export function GameOverScreen() {
  const { state, restart } = useGame()
  const standings = [...state.players].sort(
    (a, b) => b.stars - a.stars || b.coins - a.coins,
  )
  const winners = state.winners ?? []
  const sponge = [...state.players].sort((a, b) => b.sipsTaken - a.sipsTaken)[0]
  const dealer = [...state.players].sort((a, b) => b.sipsGiven - a.sipsGiven)[0]

  return (
    <div className="from-night-950 to-night-900 absolute inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b p-8">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        className="text-center"
      >
        <p className="text-gold-300/80 text-xl font-extrabold tracking-[0.35em] uppercase">
          Fin de partie
        </p>
        <h2 className="font-display text-gold-300 mt-1 animate-float text-7xl tracking-wide drop-shadow-[0_5px_0_rgba(0,0,0,0.45)]">
          👑 {standings
            .filter((p) => winners.includes(p.id))
            .map((p) => p.name)
            .join(' & ') || '???'}
        </h2>
        <p className="text-cream/80 mt-2 text-2xl font-bold">
          remporte{winners.length > 1 ? 'nt' : ''} la Super Étoile de Woody Woods !
        </p>
      </motion.div>

      <div className="mt-8 flex w-full max-w-xl flex-col gap-2.5">
        {standings.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${
              winners.includes(p.id) ? 'bg-gold-400/15 ring-2 ring-gold-400/60' : 'bg-night-800/80'
            }`}
            style={{ borderLeft: `5px solid ${p.color}` }}
          >
            <span className="font-display w-8 text-2xl">{i + 1}.</span>
            <span className="text-xl">{CHARACTERS[p.character].emoji}</span>
            <span className="text-lg font-extrabold">{p.name}</span>
            <span className="ml-auto flex gap-4 text-lg font-extrabold">
              <span>⭐ {p.stars}</span>
              <span>🪙 {p.coins}</span>
              <span className="text-cream/60">🍺 {p.sipsTaken}</span>
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-cream/75 mt-6 flex gap-8 text-base font-bold"
      >
        <span>🧽 Éponge d'or : {sponge?.name} ({sponge?.sipsTaken} gorgées bues)</span>
        <span>🍻 Distributeur fou : {dealer?.name} ({dealer?.sipsGiven} données)</span>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={restart}
        className="font-display from-gold-400 to-gold-500 text-night-950 mt-8 rounded-2xl bg-gradient-to-b px-10 py-4 text-2xl tracking-wider shadow-[0_6px_0_rgba(0,0,0,0.35)]"
      >
        ↺ REJOUER
      </motion.button>
    </div>
  )
}
