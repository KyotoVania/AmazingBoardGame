// ============================================================
// RewardsScreen.tsx — Affiche ce que chaque groupe du podium
// remporte : dé bonus Or/Argent/Maudit + gorgées (fin de manche)
// ou parts du pot (case VS), puis relance la partie.
// ============================================================

import { motion } from 'framer-motion'
import { CHARACTERS, DICE_BLOCKS, PODIUM_LAYOUTS, VS_SPLIT } from '../../game/constants'
import type { MinigameCategory, PlayerId } from '../../game/types'
import { useGame } from '../../game/useGameState'

const MEDALS: Record<MinigameCategory, string[]> = {
  FFA: ['🥇', '🥈', '🥉', '💀'],
  '2v2': ['🏆', '💀'],
  '1v1': ['🏆', '💀', '👀'],
}

/** Reproduit la répartition du pot du reducer (arrondi au 1er). */
function vsShares(pot: number): number[] {
  const shares = VS_SPLIT.map((ratio) => Math.floor(pot * ratio))
  shares[0] += pot - shares.reduce((a, b) => a + b, 0)
  return shares
}

export function RewardsScreen() {
  const { state, continueGame } = useGame()
  const mg = state.minigame
  if (!mg?.groups || !mg.category) return null
  const layout = PODIUM_LAYOUTS[mg.category]
  const isVs = mg.context === 'VS'
  const shares = isVs ? vsShares(mg.pot) : []
  const isLastRound = !isVs && state.round >= state.maxRounds

  const byId = (id: PlayerId) => state.players.find((p) => p.id === id)!

  // Une ligne par joueur, dans l'ordre des groupes du podium.
  const rows = mg.groups.flatMap((group, slotIndex) =>
    group.map((pid) => ({ pid, slotIndex })),
  )

  return (
    <div className="from-night-950/95 to-night-900/95 absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b p-8 backdrop-blur-sm">
      <h2 className="font-display text-5xl tracking-wide">🏆 Récompenses</h2>
      <p className="text-cream/70 mt-1 text-lg font-bold">{mg.title}</p>

      <div className="mt-7 flex w-full max-w-xl flex-col gap-3">
        {rows.map(({ pid, slotIndex }, i) => {
          const p = byId(pid)
          const slot = layout[slotIndex]
          return (
            <motion.div
              key={pid}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="bg-night-800/90 flex items-center gap-4 rounded-2xl px-5 py-3.5"
              style={{ borderLeft: `5px solid ${p.color}` }}
            >
              <span className="text-3xl">{MEDALS[mg.category!][slotIndex]}</span>
              <span className="text-xl">{CHARACTERS[p.character].emoji}</span>
              <span className="text-lg font-extrabold">{p.name}</span>
              <span className="text-cream/50 text-sm font-bold">{slot.label}</span>
              <span className="text-gold-300 ml-auto text-right text-sm font-extrabold">
                {isVs ? (
                  (shares[i] ?? 0) > 0 ? `+${shares[i]} 🪙` : 'rien du tout…'
                ) : (
                  <>
                    {slot.dice ? `🎲 ${DICE_BLOCKS[slot.dice].label} en bonus` : '🎲 pas de dé bonus'}
                    <span className="text-cream/75 block">
                      {slot.sips > 0 ? `🍺 boit ${slot.sips} gorgée${slot.sips > 1 ? 's' : ''}` : '😎 ne boit pas'}
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
