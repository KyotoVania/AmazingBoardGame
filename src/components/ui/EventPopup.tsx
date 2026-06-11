// ============================================================
// EventPopup.tsx — Toutes les popups d'événements : effets de
// cases, choix de cible des gorgées, arbres, Boo, Étoile, mise VS.
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { SIGNPOST_FORK_IDS, getSpace } from '../../game/board'
import { BOO_STAR_COST, STAR_COST, TREE_COIN_FRUIT } from '../../game/constants'
import { effectiveSpaceType, getCurrentPlayer } from '../../game/reducer'
import type { PendingAction, Player, PlayerId, PopupTone } from '../../game/types'
import { useGame } from '../../game/useGameState'
import { SPACE_TYPE_LABELS, arrowFor } from './labels'

const TONE_RING: Record<PopupTone, string> = {
  GOOD: 'ring-emerald-400/70',
  BAD: 'ring-red-400/70',
  NEUTRAL: 'ring-gold-400/50',
}

export function EventPopup() {
  const { state } = useGame()
  const player = getCurrentPlayer(state)
  return (
    <AnimatePresence>
      {state.pending && player && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 grid place-items-center bg-black/40 p-6"
        >
          <motion.div
            initial={{ scale: 0.8, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.86, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 330, damping: 23 }}
            className={`bg-night-900/95 w-full max-w-xl rounded-3xl p-7 text-center shadow-2xl ring-4 backdrop-blur-md ${ringFor(state.pending)}`}
          >
            <PendingContent pending={state.pending} player={player} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ringFor(pending: PendingAction): string {
  return pending.kind === 'POPUP' ? TONE_RING[pending.tone] : TONE_RING.NEUTRAL
}

function PendingContent({ pending, player }: { pending: PendingAction; player: Player }) {
  const { state, resolvePending } = useGame()
  const others = state.players.filter((p) => p.id !== player.id)

  switch (pending.kind) {
    case 'POPUP':
      return (
        <>
          <h2 className="font-display text-4xl tracking-wide">{pending.title}</h2>
          <p className="text-cream/85 mt-3 text-xl font-bold">{pending.text}</p>
          <BigButton onClick={() => resolvePending({ kind: 'DISMISS' })}>OK</BigButton>
        </>
      )

    case 'CHOOSE_SIP_TARGET':
      return (
        <>
          <h2 className="font-display text-4xl tracking-wide">🍻 À la tienne !</h2>
          <p className="text-cream/85 mt-3 text-xl font-bold">
            {player.name}, distribue {pending.sips} gorgées à un adversaire :
          </p>
          <TargetPicker
            targets={others}
            stat={(t) => `🍺 ${t.sipsTaken}`}
            onPick={(id) => resolvePending({ kind: 'SIP_TARGET', targetId: id })}
          />
        </>
      )

    case 'TREE_GOOD_CHOICE':
      return (
        <>
          <h2 className="font-display text-4xl tracking-wide">🌳 L'arbre généreux</h2>
          <p className="text-cream/85 mt-3 text-lg font-bold">Choisis ton fruit :</p>
          <div className="mt-5 flex justify-center gap-4">
            <ChoiceCard
              emoji="🪙"
              title="Fruit Pièces"
              subtitle={`+${TREE_COIN_FRUIT} pièces`}
              onClick={() => resolvePending({ kind: 'TREE_GOOD', pick: 'COIN_FRUIT' })}
            />
            <ChoiceCard
              emoji="🎲"
              title="Fruit Dé"
              subtitle="Relance et avance encore !"
              onClick={() => resolvePending({ kind: 'TREE_GOOD', pick: 'DICE_FRUIT' })}
            />
          </div>
        </>
      )

    case 'BOO_PROMPT': {
      const anyStarTarget = others.some((t) => t.stars > 0)
      return (
        <>
          <h2 className="font-display text-4xl tracking-wide">👻 Bouuuh… un Boo !</h2>
          <p className="text-cream/85 mt-3 text-lg font-bold">
            « Je peux voler pour toi, {player.name}… moyennant finance. »
          </p>
          <div className="mt-5 flex flex-col items-center gap-2.5">
            <WideButton onClick={() => resolvePending({ kind: 'BOO', action: 'STEAL_COINS' })}>
              🪙 Voler des pièces — gratuit
            </WideButton>
            <WideButton
              disabled={player.coins < BOO_STAR_COST || !anyStarTarget}
              onClick={() => resolvePending({ kind: 'BOO', action: 'STEAL_STAR' })}
            >
              ⭐ Voler une Étoile — {BOO_STAR_COST} pièces
            </WideButton>
            <WideButton ghost onClick={() => resolvePending({ kind: 'BOO', action: 'DECLINE' })}>
              Non merci, passe ton chemin
            </WideButton>
          </div>
        </>
      )
    }

    case 'BOO_PICK_VICTIM': {
      const valid = others.filter((t) => (pending.steal === 'STAR' ? t.stars > 0 : true))
      return (
        <>
          <h2 className="font-display text-4xl tracking-wide">👻 Quelle victime ?</h2>
          <p className="text-cream/85 mt-3 text-lg font-bold">
            Boo va voler {pending.steal === 'STAR' ? 'une Étoile' : 'des pièces'} à…
          </p>
          <TargetPicker
            targets={valid}
            stat={(t) => (pending.steal === 'STAR' ? `⭐ ${t.stars}` : `🪙 ${t.coins}`)}
            onPick={(id) => resolvePending({ kind: 'BOO_VICTIM', targetId: id })}
          />
        </>
      )
    }

    case 'STAR_PROMPT':
      return (
        <>
          <h2 className="font-display text-4xl tracking-wide">⭐ Toadette t'interpelle !</h2>
          <p className="text-cream/85 mt-3 text-xl font-bold">
            Une Étoile pour {STAR_COST} pièces ? (tu as {player.coins} 🪙)
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <WideButton
              disabled={player.coins < STAR_COST}
              onClick={() => resolvePending({ kind: 'STAR', buy: true })}
            >
              ⭐ ACHETER — {STAR_COST} 🪙
            </WideButton>
            <WideButton ghost onClick={() => resolvePending({ kind: 'STAR', buy: false })}>
              Plus tard…
            </WideButton>
          </div>
        </>
      )

    case 'VS_WAGER':
      return (
        <>
          <h2 className="font-display text-4xl tracking-wide">⚔️ CASE VS !</h2>
          <p className="text-cream/85 mt-3 text-xl font-bold">
            La roulette fixe la mise : <span className="text-gold-300">{pending.amount} pièces chacun</span>.
            Duel en minijeu, le pot ira aux meilleurs !
          </p>
          <BigButton onClick={() => resolvePending({ kind: 'VS_OK' })}>QUE LE MEILLEUR GAGNE !</BigButton>
        </>
      )

    case 'MOLE_PROMPT':
      return <MolePrompt cost={pending.cost} player={player} />
  }
}

// ---------- Topi Taupe : réorienter les panneaux contre des pièces ----------

function MolePrompt({ cost, player }: { cost: number; player: Player }) {
  const { state, resolvePending } = useGame()
  const [directions, setDirections] = useState<Record<string, number>>(() => ({
    ...state.signposts,
  }))

  const cycle = (forkId: string) => {
    const branches = getSpace(forkId).nextSpaces.length
    setDirections((d) => ({ ...d, [forkId]: ((d[forkId] ?? 0) + 1) % branches }))
  }

  return (
    <>
      <h2 className="font-display text-4xl tracking-wide">🦫 Topi Taupe</h2>
      <p className="text-cream/85 mt-3 text-lg font-bold">
        « Pour <span className="text-gold-300">{cost} pièces</span>, j'oriente les panneaux comme tu
        veux ! » (tu as {player.coins} 🪙)
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        {SIGNPOST_FORK_IDS.map((forkId, i) => {
          const fork = getSpace(forkId)
          const dir = (directions[forkId] ?? 0) % fork.nextSpaces.length
          const target = getSpace(fork.nextSpaces[dir])
          return (
            <button
              key={forkId}
              onClick={() => cycle(forkId)}
              className="bg-night-800 hover:bg-night-700 flex w-80 items-center gap-3 rounded-xl px-4 py-2.5"
            >
              <span className="text-cream/60 text-sm font-extrabold">Panneau {i + 1}</span>
              <span className="ml-auto text-xl">{arrowFor(target.x - fork.x, target.y - fork.y)}</span>
              <span className="text-sm font-extrabold">
                {SPACE_TYPE_LABELS[effectiveSpaceType(state, target.id)]}
              </span>
              <span className="text-cream/40 text-xs font-bold">↻</span>
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex justify-center gap-3">
        <WideButton
          disabled={player.coins < cost}
          onClick={() => resolvePending({ kind: 'MOLE', pay: true, directions })}
        >
          🦫 PAYER {cost} 🪙 et réorienter
        </WideButton>
        <WideButton ghost onClick={() => resolvePending({ kind: 'MOLE', pay: false })}>
          Non merci
        </WideButton>
      </div>
    </>
  )
}

// ---------- Petits composants ----------

function BigButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="font-display from-gold-400 to-gold-500 text-night-950 mt-6 rounded-xl bg-gradient-to-b px-8 py-3 text-2xl tracking-wider shadow-[0_5px_0_rgba(0,0,0,0.35)]"
    >
      {children}
    </motion.button>
  )
}

function WideButton({
  children,
  onClick,
  disabled,
  ghost,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  ghost?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-80 rounded-xl px-4 py-3 text-lg font-extrabold transition-colors disabled:opacity-35 ${
        ghost
          ? 'bg-night-800 text-cream/75 hover:bg-night-700'
          : 'bg-gold-400/15 text-gold-300 hover:bg-gold-400/25'
      }`}
    >
      {children}
    </button>
  )
}

function ChoiceCard({
  emoji,
  title,
  subtitle,
  onClick,
}: {
  emoji: string
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.06, rotate: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-night-800 hover:bg-night-700 w-52 rounded-2xl p-5"
    >
      <span className="block text-5xl">{emoji}</span>
      <span className="font-display mt-2 block text-xl">{title}</span>
      <span className="text-cream/60 mt-1 block text-sm font-bold">{subtitle}</span>
    </motion.button>
  )
}

function TargetPicker({
  targets,
  stat,
  onPick,
}: {
  targets: Player[]
  stat: (t: Player) => string
  onPick: (id: PlayerId) => void
}) {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-3">
      {targets.map((t) => (
        <motion.button
          key={t.id}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPick(t.id)}
          className="bg-night-800 hover:bg-night-700 flex items-center gap-2.5 rounded-xl px-4 py-3"
        >
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.color }} />
          <span className="text-lg font-extrabold">{t.name}</span>
          <span className="text-cream/60 text-sm font-bold">{stat(t)}</span>
        </motion.button>
      ))}
    </div>
  )
}
