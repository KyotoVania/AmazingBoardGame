// ============================================================
// PodiumScreen.tsx — Le Game Master glisse-dépose les 4 pions
// dans les emplacements 1er → 4e (drag & drop natif + fallback
// clic-pour-placer), puis valide le classement.
// ============================================================

import { motion } from 'framer-motion'
import { useState } from 'react'
import { CHARACTERS, PODIUM_REWARDS, VS_SPLIT } from '../../game/constants'
import type { Player, PlayerId } from '../../game/types'
import { useGame } from '../../game/useGameState'

const MEDALS = ['🥇', '🥈', '🥉', '💀']
const SLOT_HEIGHTS = ['h-40', 'h-32', 'h-26', 'h-20']

export function PodiumScreen() {
  const { state, setPodium } = useGame()
  const [slots, setSlots] = useState<(PlayerId | null)[]>([null, null, null, null])
  const [selected, setSelected] = useState<PlayerId | null>(null)
  const isVs = state.minigame?.context === 'VS'

  const placed = new Set(slots.filter((s): s is PlayerId => s !== null))
  const pool = state.players.filter((p) => !placed.has(p.id))
  const complete = slots.every((s) => s !== null)

  const assign = (slotIndex: number, pid: PlayerId) => {
    setSlots((prev) => {
      const next = prev.map((s) => (s === pid ? null : s))
      next[slotIndex] = pid
      return next
    })
    setSelected(null)
  }

  const clearSlot = (slotIndex: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[slotIndex] = null
      return next
    })
  }

  return (
    <div className="from-night-950/95 to-night-900/95 absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b p-8 backdrop-blur-sm">
      <h2 className="font-display text-5xl tracking-wide">📋 Le Podium</h2>
      <p className="text-cream/70 mt-2 text-lg font-bold">
        {state.minigame?.title} — glisse (ou clique) chaque équipe sur sa marche
      </p>

      {/* Pool de pions à placer */}
      <div className="mt-7 flex min-h-20 items-center gap-4">
        {pool.length === 0 ? (
          <p className="text-cream/45 text-lg font-bold">Tout le monde est classé ✓</p>
        ) : (
          pool.map((p) => (
            <PlayerChip
              key={p.id}
              player={p}
              selected={selected === p.id}
              onClick={() => setSelected(selected === p.id ? null : p.id)}
            />
          ))
        )}
      </div>

      {/* Les 4 marches */}
      <div className="mt-8 flex items-end gap-4">
        {slots.map((pid, i) => {
          const player = pid ? state.players.find((p) => p.id === pid) : null
          return (
            <div key={i} className="flex w-44 flex-col items-center gap-2">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const dropped = e.dataTransfer.getData('text/plain') as PlayerId
                  if (dropped) assign(i, dropped)
                }}
                onClick={() => {
                  if (selected) assign(i, selected)
                  else if (pid) clearSlot(i)
                }}
                className={`grid w-full place-items-center rounded-t-2xl border-2 border-dashed transition-colors ${SLOT_HEIGHTS[i]} ${
                  player
                    ? 'border-transparent'
                    : selected
                      ? 'border-gold-400 bg-gold-400/10'
                      : 'border-cream/20 bg-night-800/60'
                }`}
                style={player ? { backgroundColor: `${player.color}33`, borderColor: player.color } : undefined}
              >
                {player ? (
                  <PlayerChip player={player} onClick={() => clearSlot(i)} />
                ) : (
                  <span className="text-cream/35 text-sm font-bold">Déposer ici</span>
                )}
              </div>
              <div className="bg-night-800 w-full rounded-b-xl py-2 text-center">
                <p className="font-display text-2xl">{MEDALS[i]} {i + 1}{i === 0 ? 'er' : 'e'}</p>
                <p className="text-gold-300/90 px-2 text-xs font-extrabold">
                  {isVs
                    ? `${Math.round(VS_SPLIT[i] * 100)}% du pot`
                    : PODIUM_REWARDS[i].label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <motion.button
        whileHover={complete ? { scale: 1.05 } : undefined}
        whileTap={complete ? { scale: 0.95 } : undefined}
        disabled={!complete}
        onClick={() => setPodium(slots as PlayerId[])}
        className="font-display from-gold-400 to-gold-500 text-night-950 mt-9 rounded-2xl bg-gradient-to-b px-10 py-4 text-2xl tracking-wider shadow-[0_6px_0_rgba(0,0,0,0.35)] disabled:opacity-35"
      >
        ✅ VALIDER LE CLASSEMENT
      </motion.button>
    </div>
  )
}

function PlayerChip({
  player,
  selected,
  onClick,
}: {
  player: Player
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', player.id)}
      onClick={onClick}
      className={`flex cursor-grab items-center gap-2 rounded-full px-4 py-2.5 font-extrabold shadow-lg transition-transform hover:scale-105 active:cursor-grabbing ${
        selected ? 'ring-3 ring-gold-300 -translate-y-1 scale-110' : ''
      }`}
      style={{ backgroundColor: player.color }}
    >
      <span className="text-xl">{CHARACTERS[player.character].emoji}</span>
      <span className="text-night-950">{player.name}</span>
    </button>
  )
}
