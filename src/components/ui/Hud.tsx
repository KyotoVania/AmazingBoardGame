// ============================================================
// Hud.tsx — HUD latéral collant : cartes joueurs (avatar, items,
// gorgées, pièces, étoiles) + bandeau de manche en haut.
// ============================================================

import { motion } from 'framer-motion'
import { distanceBetween } from '../../game/board'
import { CHARACTERS, DICE_BLOCKS, ITEMS, MAX_INVENTORY } from '../../game/constants'
import type { GamePhase, Player } from '../../game/types'
import { useGame } from '../../game/useGameState'

const PHASE_LABELS: Record<GamePhase, string> = {
  LOBBY: 'Lobby',
  TURN_START: 'Préparation',
  ROLLING: 'Le dé roule…',
  MOVING: 'Déplacement',
  FORK_CHOICE: 'Choix du chemin',
  PASS_EVENT: 'Rencontre !',
  SPACE_ACTION: 'Effet de case',
  TURN_END: 'Fin de tour',
  MINIGAME_CATEGORY: 'Roulette minijeu',
  MINIGAME_TITLE: 'Roulette minijeu',
  MINIGAME_PLAY: 'Minijeu en cours',
  PODIUM: 'Saisie du podium',
  REWARDS: 'Récompenses',
  ROUND_INTRO: 'Nouvelle manche',
  GAME_OVER: 'Fin de partie',
}

export function Hud() {
  const { state } = useGame()
  if (state.players.length === 0) return null
  const activeId = state.players[state.currentPlayerIndex]?.id
  const left = state.players.slice(0, 2)
  const right = state.players.slice(2)

  return (
    <>
      {/* Bandeau de manche */}
      <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2">
        <div className="bg-night-900/70 flex items-center gap-3 rounded-full px-5 py-2 backdrop-blur-sm">
          <span className="font-display text-gold-300 text-lg tracking-wide">🌲 Woody Woods</span>
          <span className="text-cream/60 text-sm font-bold">
            Manche {state.round}/{state.maxRounds}
          </span>
          <span className="bg-gold-400/15 text-gold-300 rounded-full px-2.5 py-0.5 text-xs font-extrabold tracking-wide uppercase">
            {PHASE_LABELS[state.phase]}
          </span>
        </div>
      </div>

      <div className="absolute top-1/2 left-3 z-10 flex w-56 -translate-y-1/2 flex-col gap-3">
        {left.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            active={p.id === activeId}
            starDist={distanceBetween(p.currentSpaceId, state.starSpaceId)}
          />
        ))}
      </div>
      <div className="absolute top-1/2 right-3 z-10 flex w-56 -translate-y-1/2 flex-col gap-3">
        {right.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            active={p.id === activeId}
            starDist={distanceBetween(p.currentSpaceId, state.starSpaceId)}
          />
        ))}
      </div>
    </>
  )
}

function PlayerCard({
  player,
  active,
  starDist,
}: {
  player: Player
  active: boolean
  /** Distance BFS jusqu'à l'Étoile (doc Woody Woods : sans compter les panneaux). */
  starDist: number
}) {
  const char = CHARACTERS[player.character]
  return (
    <motion.div
      layout
      animate={{ scale: active ? 1.04 : 1, opacity: active ? 1 : 0.82 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="bg-night-900/75 relative overflow-hidden rounded-2xl p-3 shadow-xl backdrop-blur-sm"
      style={{ borderLeft: `5px solid ${player.color}` }}
    >
      {active && (
        <motion.div
          layoutId="active-glow"
          className="bg-gold-400/10 pointer-events-none absolute inset-0"
        />
      )}
      <div className="flex items-center gap-2.5">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full text-2xl shadow-inner"
          style={{ backgroundColor: player.color }}
        >
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            char.emoji
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{player.name}</p>
          <p className="text-cream/55 text-xs font-semibold">{char.name}</p>
        </div>
        {active && <span className="font-display text-gold-300 ml-auto animate-pulse text-xs">▶</span>}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm font-bold">
        <span>🪙 {player.coins}</span>
        <span>⭐ {player.stars}</span>
        <span title="Gorgées bues">🍺 {player.sipsTaken}</span>
        <span title="Gorgées distribuées">🫗 {player.sipsGiven}</span>
      </div>
      {(player.allies?.length ?? 0) > 0 && (
        <p className="mt-1 text-[11px] font-extrabold text-pink-300/90" title="Alliés : +1/+2 au lancer chacun">
          🤝 {player.allies!.map((a) => CHARACTERS[a].emoji).join(' ')}{' '}
          <span className="text-cream/50">(+{player.allies!.length}–{player.allies!.length * 2} au dé)</span>
        </p>
      )}
      {starDist >= 0 && (
        <p
          className="text-gold-300/80 mt-1 text-[11px] font-extrabold"
          title="Au plus court — sans tenir compte des panneaux !"
        >
          ⭐ à {starDist} case{starDist > 1 ? 's' : ''} (si les panneaux coopèrent…)
        </p>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        {Array.from({ length: MAX_INVENTORY }, (_, i) => {
          const itemId = player.inventory[i]
          return (
            <div
              key={i}
              title={itemId ? `${ITEMS[itemId].name} — ${ITEMS[itemId].description}` : 'Emplacement vide'}
              className="bg-night-800/90 grid h-8 w-8 place-items-center rounded-lg text-base"
            >
              {itemId ? ITEMS[itemId].emoji : <span className="text-cream/20">·</span>}
            </div>
          )
        })}
        <div className="ml-auto flex flex-col items-end gap-0.5">
          {player.rewardDice && (
            <span className="bg-gold-400/20 text-gold-300 rounded px-1.5 py-0.5 text-[10px] font-extrabold">
              {DICE_BLOCKS[player.rewardDice].label}
            </span>
          )}
          {player.poisoned && (
            <span className="rounded bg-purple-500/25 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-300">
              ☠️ -2 au dé
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
