// ============================================================
// ActionBar.tsx — Barre d'action contextuelle (bas de l'écran) :
// pré-roll (items + choix du dé, y compris le dé BONUS du podium),
// infos de déplacement, choix d'embranchement libre, fin de tour.
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { BOARD, getSpace } from '../../game/board'
import { CHARACTERS, DICE_BLOCKS, ITEMS } from '../../game/constants'
import { effectiveSpaceType, getCurrentPlayer, movementCandidates } from '../../game/reducer'
import type { DiceBlockId, ItemId, Player } from '../../game/types'
import { useGame } from '../../game/useGameState'
import { getCameraMode, toggleCameraMode } from '../three/cameraMode'
import { SPACE_TYPE_LABELS, arrowFor } from './labels'

export function ActionBar() {
  const { state } = useGame()
  const player = getCurrentPlayer(state)
  if (!player) return null

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-full max-w-3xl -translate-x-1/2 px-4">
      <AnimatePresence mode="wait">
        {state.phase === 'TURN_START' && <PreRollBar key="preroll" player={player} />}
        {state.phase === 'ROLLING' && (
          <InfoBar
            key="rolling"
            text={`🎲 ${player.name} lance le ${DICE_BLOCKS[state.dice?.blockId ?? 'NORMAL'].label}${
              state.dice?.bonus ? ` + le ${DICE_BLOCKS[state.dice.bonus.blockId].label} en bonus !` : '…'
            }`}
          />
        )}
        {state.phase === 'MOVING' && state.movement && (
          <InfoBar
            key="moving"
            text={`${state.movement.backward ? '↩️ Recul' : '🏃 Déplacement'} — ${state.movement.remaining} pas restant${state.movement.remaining > 1 ? 's' : ''}`}
          />
        )}
        {state.phase === 'FORK_CHOICE' && <ForkBar key="fork" player={player} />}
        {state.phase === 'TURN_END' && <EndTurnBar key="end" player={player} />}
      </AnimatePresence>
    </div>
  )
}

function BarShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="bg-night-900/85 pointer-events-auto rounded-2xl p-4 shadow-2xl backdrop-blur-md"
    >
      {children}
    </motion.div>
  )
}

function InfoBar({ text }: { text: string }) {
  return (
    <BarShell>
      <p className="text-center text-lg font-extrabold">{text}</p>
    </BarShell>
  )
}

// ---------- Pré-roll : item + dé + lancer ----------

function PreRollBar({ player }: { player: Player }) {
  const { state, rollDice } = useGame()
  const [selectedDice, setSelectedDice] = useState<DiceBlockId>('NORMAL')
  const [itemsOpen, setItemsOpen] = useState(false)
  const [overview, setOverview] = useState(() => getCameraMode() === 'overview')
  const charDice = DICE_BLOCKS[player.character]
  const reward = player.rewardDice
  const faces = DICE_BLOCKS[selectedDice].faces

  return (
    <BarShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl tracking-wide" style={{ color: player.color }}>
            {CHARACTERS[player.character].emoji} {player.name}
          </p>
          <p className="text-cream/60 text-xs font-bold">
            1. Utilise un item (optionnel) · 2. Choisis ton dé · 3. LANCE !
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOverview(toggleCameraMode() === 'overview')}
            className="bg-night-800 hover:bg-night-700 rounded-xl px-4 py-2.5 text-sm font-extrabold"
            title={overview ? 'Revenir au suivi du pion' : 'Vue d’ensemble du plateau'}
          >
            {overview ? '🎯 Pion' : '🗺️ Map'}
          </button>
          <button
            onClick={() => setItemsOpen(true)}
            disabled={player.inventory.length === 0 || state.itemUsedThisTurn}
            className="bg-night-800 hover:bg-night-700 rounded-xl px-4 py-2.5 text-sm font-extrabold disabled:opacity-40"
          >
            🎒 Items ({player.inventory.length})
            {state.itemUsedThisTurn && <span className="text-cream/50 block text-[10px]">déjà utilisé</span>}
          </button>
        </div>
      </div>

      {reward && (
        <div className="bg-gold-400/15 text-gold-300 mt-3 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold">
          🎁 {DICE_BLOCKS[reward].label} ({DICE_BLOCKS[reward].faces[0].value}–
          {DICE_BLOCKS[reward].faces[5].value}) — lancé <u>automatiquement en plus</u> de ton dé !
        </div>
      )}

      {player.trapped && (
        <div className="mt-3 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-extrabold text-red-300">
          🕳️ {player.name} est au fond du trou ! Il faut un lancer total ≥ {state.config.pitEscapeMin}{' '}
          pour sortir, sinon tu restes coincé.
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="bg-night-800 flex flex-1 gap-1 rounded-xl p-1">
          <DiceChoice
            label="Dé Normal"
            active={selectedDice === 'NORMAL'}
            onClick={() => setSelectedDice('NORMAL')}
          />
          <DiceChoice
            label={charDice.label}
            active={selectedDice === player.character}
            onClick={() => setSelectedDice(player.character)}
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => rollDice(selectedDice)}
          className="font-display from-gold-400 to-gold-500 text-night-950 rounded-xl bg-gradient-to-b px-8 py-3 text-2xl tracking-wider shadow-[0_5px_0_rgba(0,0,0,0.35)]"
        >
          🎲 LANCER
        </motion.button>
      </div>

      <div className="text-cream/65 mt-2 flex flex-wrap items-center gap-1 text-xs font-bold">
        <span className="text-gold-300/90">Faces :</span>
        {faces.map((f, i) => (
          <span key={i} className="bg-night-800 rounded px-1.5 py-0.5">
            {f.value}
            {f.coins ? (
              <span className={f.coins > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {' '}({f.coins > 0 ? '+' : ''}{f.coins}🪙)
              </span>
            ) : null}
          </span>
        ))}
        {state.rollBonus > 0 && (
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">
            +{state.rollBonus} champignon
          </span>
        )}
        {player.poisoned && (
          <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-300">-2 poison</span>
        )}
        {state.forcedRoll !== null && (
          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">
            🎯 résultat forcé : {state.forcedRoll}
          </span>
        )}
      </div>

      <AnimatePresence>{itemsOpen && <ItemMenu player={player} onClose={() => setItemsOpen(false)} />}</AnimatePresence>
    </BarShell>
  )
}

function DiceChoice({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-extrabold transition-colors ${
        active ? 'bg-gold-400 text-night-950' : 'text-cream/70 hover:bg-night-700'
      }`}
    >
      {label}
    </button>
  )
}

// ---------- Menu d'items (avant de lancer) ----------

function ItemMenu({ player, onClose }: { player: Player; onClose: () => void }) {
  const { state, useItem } = useGame()
  const [picked, setPicked] = useState<ItemId | null>(null)
  const others = state.players.filter((p) => p.id !== player.id)

  const confirm = (itemId: ItemId, targetId?: (typeof others)[number]['id'], value?: number) => {
    useItem(itemId, targetId, value)
    onClose()
  }

  const pickedDef = picked ? ITEMS[picked] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="bg-night-800/95 mt-3 rounded-xl p-3"
    >
      {!pickedDef ? (
        <div className="flex flex-wrap gap-2">
          {player.inventory.map((itemId, i) => {
            const item = ITEMS[itemId]
            return (
              <button
                key={`${itemId}-${i}`}
                onClick={() => {
                  if (item.needsTarget || item.needsValue) setPicked(itemId)
                  else confirm(itemId)
                }}
                className="bg-night-900 hover:bg-night-700 flex items-center gap-2 rounded-lg px-3 py-2 text-left"
              >
                <span className="text-2xl">{item.emoji}</span>
                <span>
                  <span className="block text-sm font-extrabold">{item.name}</span>
                  <span className="text-cream/55 block text-xs font-semibold">{item.description}</span>
                </span>
              </button>
            )
          })}
          <button onClick={onClose} className="text-cream/60 hover:text-cream ml-auto self-center px-2 text-sm font-bold">
            Fermer ✕
          </button>
        </div>
      ) : pickedDef.needsValue ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold">{pickedDef.emoji} Choisis le résultat :</span>
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <button
              key={v}
              onClick={() => confirm(pickedDef.id, undefined, v)}
              className="bg-night-900 hover:bg-gold-400 hover:text-night-950 h-10 w-10 rounded-lg text-lg font-extrabold"
            >
              {v}
            </button>
          ))}
          <button onClick={() => setPicked(null)} className="text-cream/60 hover:text-cream ml-auto text-sm font-bold">
            ← Retour
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold">{pickedDef.emoji} Sur qui ?</span>
          {others.map((t) => {
            const invalid =
              (pickedDef.id === 'FLY_GUY_TICKET' && t.inventory.length === 0) ||
              (pickedDef.id === 'COINADO' && t.coins === 0)
            return (
              <button
                key={t.id}
                disabled={invalid}
                onClick={() => confirm(pickedDef.id, t.id)}
                className="bg-night-900 hover:bg-night-700 flex items-center gap-2 rounded-lg px-3 py-2 disabled:opacity-35"
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-extrabold">{t.name}</span>
                <span className="text-cream/55 text-xs font-bold">
                  🪙{t.coins} · 🎒{t.inventory.length}
                </span>
              </button>
            )
          })}
          <button onClick={() => setPicked(null)} className="text-cream/60 hover:text-cream ml-auto text-sm font-bold">
            ← Retour
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ---------- Choix d'embranchement (forks LIBRES uniquement) ----------

function ForkBar({ player }: { player: Player }) {
  const { state, chooseFork } = useGame()
  const space = getSpace(player.currentSpaceId)
  const cameFrom = state.movement?.cameFrom ?? null
  // candidats au sens de déplacement EFFECTIF (joueur inversé ⇄ compris)
  const candidates = state.movement
    ? movementCandidates(player, state.movement)
    : space.nextSpaces
  const options = candidates.filter((id) => id !== cameFrom)
  return (
    <BarShell>
      <p className="text-center text-lg font-extrabold">
        🛤️ Carrefour ! Choisis ta direction (ou clique une case dorée)
      </p>
      <div className="mt-3 flex justify-center gap-3">
        {options.map((id) => {
          const target = BOARD[id]
          const type = effectiveSpaceType(state, id)
          return (
            <motion.button
              key={id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => chooseFork(id)}
              className="bg-night-800 hover:bg-night-700 rounded-xl px-5 py-3 text-left"
            >
              <span className="text-2xl">{arrowFor(target.x - space.x, target.y - space.y)}</span>
              <span className="ml-2 text-sm font-extrabold">
                {space.branchLabels?.[space.nextSpaces.indexOf(id)] ?? SPACE_TYPE_LABELS[type]}
              </span>
            </motion.button>
          )
        })}
      </div>
    </BarShell>
  )
}

// ---------- Fin de tour ----------

function EndTurnBar({ player }: { player: Player }) {
  const { state, endTurn } = useGame()
  const isLast = state.currentPlayerIndex === state.players.length - 1
  return (
    <BarShell>
      <div className="flex items-center justify-between gap-4">
        <p className="text-lg font-extrabold">
          Tour de <span style={{ color: player.color }}>{player.name}</span> terminé
          {state.dice ? ` (dé : ${state.dice.steps})` : ''}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={endTurn}
          className={`font-display rounded-xl px-6 py-2.5 text-xl tracking-wide shadow-[0_4px_0_rgba(0,0,0,0.35)] ${
            isLast
              ? 'bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 text-white'
              : 'from-gold-400 to-gold-500 text-night-950 bg-gradient-to-b'
          }`}
        >
          {isLast ? '🎰 MINIJEU !' : 'Joueur suivant ➜'}
        </motion.button>
      </div>
    </BarShell>
  )
}
