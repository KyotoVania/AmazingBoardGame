// ============================================================
// PodiumScreen.tsx — Saisie du résultat du minijeu.
//   · 1v1 / 2v2 : les équipes ont été tirées AUTOMATIQUEMENT à la
//     roulette → le GM clique simplement sur le vainqueur.
//   · FFA (et cases VS) : drag & drop des 4 pions sur les marches.
// ============================================================

import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { CHARACTERS, DICE_BLOCKS, PODIUM_LAYOUTS, VS_SPLIT } from '../../game/constants'
import type { MinigameCategory, Player, PlayerId } from '../../game/types'
import { useGame } from '../../game/useGameState'

const MEDALS: Record<MinigameCategory, string[]> = {
  FFA: ['🥇', '🥈', '🥉', '💀'],
  '2v2': ['🏆', '💀'],
  '1v1': ['🏆', '💀', '👀'],
}

/** Hauteur de la marche selon la position (effet podium décroissant). */
const SLOT_HEIGHTS = ['h-40', 'h-32', 'h-26', 'h-20']

export function PodiumScreen() {
  const { state } = useGame()
  const mg = state.minigame
  if (mg?.teams && (mg.category === '1v1' || mg.category === '2v2')) {
    return <QuickResult />
  }
  return <FfaPodium />
}

// ---------- 1v1 / 2v2 : un clic sur le vainqueur ----------

function QuickResult() {
  const { state, setPodium } = useGame()
  const mg = state.minigame!
  const teams = mg.teams!
  const byId = (id: PlayerId) => state.players.find((p) => p.id === id)!
  const spectators = state.players
    .filter((p) => !teams.flat().includes(p.id))
    .map((p) => p.id)

  const declareWinner = (winnerIndex: number) => {
    const winners = teams[winnerIndex]
    const losers = teams[1 - winnerIndex]
    const groups =
      mg.category === '1v1' ? [winners, losers, spectators] : [winners, losers]
    setPodium(groups)
  }

  const TeamCard = ({ ids, onClick }: { ids: PlayerId[]; onClick: () => void }) => (
    <motion.button
      whileHover={{ scale: 1.05, rotate: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-night-800 hover:bg-night-700 flex min-w-56 flex-col items-center gap-3 rounded-3xl p-6"
    >
      <span className="text-4xl">🏆</span>
      {ids.map((id) => {
        const p = byId(id)
        return (
          <span
            key={id}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-lg font-extrabold"
            style={{ backgroundColor: p.color, color: '#14101f' }}
          >
            {CHARACTERS[p.character].emoji} {p.name}
          </span>
        )
      })}
      <span className="text-cream/55 text-xs font-bold">a gagné !</span>
    </motion.button>
  )

  return (
    <div className="from-night-950/95 to-night-900/95 absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b p-8 backdrop-blur-sm">
      <h2 className="font-display text-5xl tracking-wide">⚔️ Qui a gagné ?</h2>
      <p className="text-cream/70 mt-2 text-lg font-bold">{mg.title} — clique sur le camp vainqueur</p>
      <div className="mt-8 flex items-center gap-6">
        <TeamCard ids={teams[0]} onClick={() => declareWinner(0)} />
        <span className="font-display text-gold-300 text-4xl">VS</span>
        <TeamCard ids={teams[1]} onClick={() => declareWinner(1)} />
      </div>
      {mg.category === '1v1' && spectators.length > 0 && (
        <p className="text-cream/50 mt-6 text-sm font-bold">
          👀 {spectators.map((id) => byId(id).name).join(' & ')} regardaient — aucun dé, aucune
          gorgée pour eux.
        </p>
      )}
    </div>
  )
}

// ---------- FFA / VS : drag & drop sur les marches ----------

function FfaPodium() {
  const { state, setPodium } = useGame()
  const category = state.minigame?.category ?? 'FFA'
  const layout = PODIUM_LAYOUTS[category]
  const isVs = state.minigame?.context === 'VS'

  // Un tableau de cellules par emplacement du layout (count cellules).
  const [slots, setSlots] = useState<(PlayerId | null)[][]>(() =>
    layout.map((slot) => Array<PlayerId | null>(slot.count).fill(null)),
  )
  const [selected, setSelected] = useState<PlayerId | null>(null)

  const placed = useMemo(() => new Set(slots.flat().filter((c): c is PlayerId => c !== null)), [slots])
  const pool = state.players.filter((p) => !placed.has(p.id))
  const complete = slots.every((cells) => cells.every((c) => c !== null))

  /** Place un joueur dans un emplacement (1re cellule libre, sinon remplace la dernière). */
  const assign = (slotIndex: number, pid: PlayerId) => {
    setSlots((prev) => {
      const next = prev.map((cells) => cells.map((c) => (c === pid ? null : c)))
      const cells = next[slotIndex]
      const free = cells.indexOf(null)
      cells[free === -1 ? cells.length - 1 : free] = pid
      return next
    })
    setSelected(null)
  }

  const remove = (pid: PlayerId) => {
    setSlots((prev) => prev.map((cells) => cells.map((c) => (c === pid ? null : c))))
  }

  return (
    <div className="from-night-950/95 to-night-900/95 absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b p-8 backdrop-blur-sm">
      <h2 className="font-display text-5xl tracking-wide">📋 Le Podium</h2>
      <p className="text-cream/70 mt-2 text-lg font-bold">
        {state.minigame?.title} — glisse (ou clique) chaque joueur sur sa place
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

      {/* Les marches (une colonne par emplacement du layout) */}
      <div className="mt-8 flex items-end gap-4">
        {layout.map((slot, i) => {
          const cells = slots[i]
          const reward = isVs
            ? `${Math.round((VS_SPLIT[i] ?? 0) * 100)}% du pot`
            : `${slot.dice ? DICE_BLOCKS[slot.dice].label : 'Pas de dé'} · ${slot.sips} gorgée${slot.sips > 1 ? 's' : ''}`
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
                }}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-t-2xl border-2 border-dashed py-2 transition-colors ${SLOT_HEIGHTS[i] ?? 'h-32'} ${
                  cells.every((c) => c !== null)
                    ? 'border-cream/10 bg-night-800/40'
                    : selected
                      ? 'border-gold-400 bg-gold-400/10'
                      : 'border-cream/20 bg-night-800/60'
                }`}
              >
                {cells.map((pid, j) => {
                  const player = pid ? state.players.find((p) => p.id === pid) : null
                  return player ? (
                    <PlayerChip key={j} player={player} onClick={() => remove(player.id)} />
                  ) : (
                    <span key={j} className="text-cream/35 text-sm font-bold">
                      Déposer ici
                    </span>
                  )
                })}
              </div>
              <div className="bg-night-800 w-full rounded-b-xl py-2 text-center">
                <p className="font-display text-2xl">
                  {MEDALS[category][i]} {slot.label}
                </p>
                <p className="text-gold-300/90 px-2 text-xs font-extrabold">{reward}</p>
              </div>
            </div>
          )
        })}
      </div>

      <motion.button
        whileHover={complete ? { scale: 1.05 } : undefined}
        whileTap={complete ? { scale: 0.95 } : undefined}
        disabled={!complete}
        onClick={() => setPodium(slots.map((cells) => cells.filter((c): c is PlayerId => c !== null)))}
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
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
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
