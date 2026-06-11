// ============================================================
// RewardsScreen.tsx — Affiche ce que chaque rang remporte :
// dés Or/Argent/Maudit + gorgées (fin de manche) ou parts du
// pot (case VS), puis relance la partie.
// ============================================================

import { motion } from 'framer-motion'
import { CHARACTERS, PODIUM_REWARDS, VS_SPLIT } from '../../game/constants'
import type { PlayerId } from '../../game/types'
import { useGame } from '../../game/useGameState'

const MEDALS = ['🥇', '🥈', '🥉', '💀']

/** Reproduit la répartition du pot du reducer (arrondi au 1er). */
function vsShares(pot: number): number[] {
  const shares = VS_SPLIT.map((ratio) => Math.floor(pot * ratio))
  shares[0] += pot - shares.reduce((a, b) => a + b, 0)
  return shares
}

export function RewardsScreen() {
  const { state, continueGame } = useGame()
  const mg = state.minigame
  if (!mg?.ranking) return null
  const isVs = mg.context === 'VS'
  const shares = isVs ? vsShares(mg.pot) : []
  const isLastRound = !isVs && state.round >= state.maxRounds

  const byId = (id: PlayerId) => state.players.find((p) => p.id === id)!

  return (
    <div className="from-night-950/95 to-night-900/95 absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b p-8 backdrop-blur-sm">
      <h2 className="font-display text-5xl tracking-wide">🏆 Récompenses</h2>
      <p className="text-cream/70 mt-1 text-lg font-bold">{mg.title}</p>

      <div className="mt-7 flex w-full max-w-xl flex-col gap-3">
        {mg.ranking.map((pid, i) => {
          const p = byId(pid)
          return (
            <motion.div
              key={pid}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="bg-night-800/90 flex items-center gap-4 rounded-2xl px-5 py-3.5"
              style={{ borderLeft: `5px solid ${p.color}` }}
            >
              <span className="text-3xl">{MEDALS[i]}</span>
              <span className="text-xl">{CHARACTERS[p.character].emoji}</span>
              <span className="text-lg font-extrabold">{p.name}</span>
              <span className="text-gold-300 ml-auto text-right text-sm font-extrabold">
                {isVs ? (
                  shares[i] > 0 ? `+${shares[i]} 🪙` : 'rien du tout…'
                ) : (
                  <>
                    {PODIUM_REWARDS[i].dice ? `🎲 Dé ${PODIUM_REWARDS[i].dice === 'GOLD' ? 'Or' : PODIUM_REWARDS[i].dice === 'SILVER' ? 'Argent' : 'Maudit'}` : '🎲 Dé Normal'}
                    <span className="text-cream/75 block">
                      {PODIUM_REWARDS[i].sips > 0 ? `🍺 boit ${PODIUM_REWARDS[i].sips} gorgée${PODIUM_REWARDS[i].sips > 1 ? 's' : ''}` : '😎 ne boit pas'}
                    </span>
                  </>
                )}
              </span>
            </motion.div>
          )
        })}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={continueGame}
        className="font-display from-gold-400 to-gold-500 text-night-950 mt-9 rounded-2xl bg-gradient-to-b px-10 py-4 text-2xl tracking-wider shadow-[0_6px_0_rgba(0,0,0,0.35)]"
      >
        {isVs ? '➜ ON REPREND LE PLATEAU' : isLastRound ? '🏁 RÉSULTATS FINAUX' : `➜ MANCHE ${state.round + 1}`}
      </motion.button>
    </div>
  )
}
