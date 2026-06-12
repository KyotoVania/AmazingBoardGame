// ============================================================
// EventPopup.tsx — La BOÎTE DE DIALOGUE des événements, ancrée en
// bas de l'écran façon visual novel : portrait du « personnage »
// (arbre, Boo, Toadette, Topi Taupe…), nom, texte, et les choix.
// La caméra reste libre de cadrer la scène au-dessus (travelling
// géré par CameraRig via state.focusSpaceId).
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SIGNPOST_FORK_IDS, getSpace } from '../../game/board'
import { ITEMS, TREE_COIN_FRUIT } from '../../game/constants'
import { EVENT_CHARACTERS, type EventCharacterId } from '../../game/eventImages'
import { usePortraitUrl } from '../../game/portraitOverrides'
import { effectiveStarCost, isFinalRound } from '../../game/reducer'
import { pickNarrative } from '../../game/eventNarratives'
import { effectiveSpaceType, getCurrentPlayer } from '../../game/reducer'
import type { BadLuckOutcome, PendingAction, Player, PlayerId, PopupTone } from '../../game/types'
import { useGame } from '../../game/useGameState'
import { SPACE_TYPE_LABELS, arrowFor } from './labels'

const TONE_RING: Record<PopupTone, string> = {
  GOOD: 'ring-emerald-400/70',
  BAD: 'ring-red-400/70',
  NEUTRAL: 'ring-gold-400/50',
}

interface Speaker {
  portrait: string
  imageUrl: string | null
  name: string
  tone: PopupTone
  /** Présent quand le portrait vient du registre : permet l'override custom. */
  characterId?: EventCharacterId
}

/** Devine le personnage d'un POPUP générique d'après son titre. */
function popupCharacter(title: string): EventCharacterId | null {
  const t = title.toLowerCase()
  if (t.includes('kamek')) return 'KAMEK'
  if (t.includes('boo')) return 'BOO'
  if (t.includes('taupe')) return 'MOLE'
  if (t.includes('trou') || t.includes('coincé') || t.includes('libéré')) return 'PIT'
  if (t.includes('arbre maudit')) return 'TREE_BAD'
  if (t.includes('arbre généreux')) return 'TREE_GOOD'
  if (t.includes('panneau')) return 'SIGNPOST'
  if (t.includes('étoile')) return 'STAR'
  if (t.includes('champignon')) return 'MUSHROOM'
  return null
}

function fromRegistry(id: EventCharacterId, tone: PopupTone, name?: string): Speaker {
  const def = EVENT_CHARACTERS[id]
  return { portrait: def.emoji, imageUrl: def.imageUrl, name: name ?? def.name, tone, characterId: id }
}

/** Portrait (image du registre ou emoji) + nom du personnage qui parle. */
function speakerFor(pending: PendingAction): Speaker {
  switch (pending.kind) {
    case 'POPUP': {
      const emoji = pending.title.match(/^\p{Extended_Pictographic}+/u)?.[0]
      const name = emoji ? pending.title.slice(emoji.length).trim() : pending.title
      const charId = popupCharacter(pending.title)
      if (charId) return fromRegistry(charId, pending.tone, name)
      return { portrait: emoji ?? '❕', imageUrl: null, name, tone: pending.tone }
    }
    case 'CHOOSE_SIP_TARGET':
      return { portrait: '🍻', imageUrl: null, name: 'Distribution générale', tone: 'GOOD' }
    case 'TREE_GOOD_CHOICE':
      return fromRegistry('TREE_GOOD', 'GOOD')
    case 'BOO_PROMPT':
    case 'BOO_PICK_VICTIM':
      return fromRegistry('BOO', 'NEUTRAL')
    case 'STAR_PROMPT':
      return fromRegistry('TOADETTE', 'GOOD')
    case 'VS_WAGER':
      return { portrait: '⚔️', imageUrl: null, name: 'Case VS', tone: 'NEUTRAL' }
    case 'MOLE_PROMPT':
      return fromRegistry('MOLE', 'NEUTRAL')
    case 'BAD_LUCK_WHEEL':
      return fromRegistry('KAMEK', 'BAD', 'La Roue de Kamek')
    case 'WALL_PROMPT':
      return { portrait: '🧱', imageUrl: null, name: 'LE MUR', tone: 'NEUTRAL' }
    case 'GATE_PROMPT':
      return { portrait: '🚪', imageUrl: null, name: 'Portail à péage', tone: 'NEUTRAL' }
    case 'SHOP_PROMPT':
      return fromRegistry('FLUTTER', 'GOOD', 'Boutique de Flutter')
  }
}

/** Portrait avec image custom et repli automatique sur l'emoji. */
function Portrait({ speaker }: { speaker: Speaker }) {
  const [failed, setFailed] = useState(false)
  // Override custom réactif quand le portrait vient du registre, sinon image statique.
  const overrideUrl = usePortraitUrl(speaker.characterId ?? 'BOO')
  const imageUrl = speaker.characterId ? overrideUrl : speaker.imageUrl
  const showImage = imageUrl && !failed
  return (
    <motion.div
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.08 }}
      className="bg-night-800 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl text-5xl shadow-inner"
    >
      {showImage ? (
        <img
          key={imageUrl}
          src={imageUrl}
          alt={speaker.name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        speaker.portrait
      )}
    </motion.div>
  )
}

export function EventPopup() {
  const { state } = useGame()
  const player = getCurrentPlayer(state)
  const pending = state.pending
  const speaker = pending ? speakerFor(pending) : null

  return (
    <AnimatePresence>
      {pending && player && speaker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-6"
        >
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 330, damping: 26 }}
            className={`bg-night-900/95 pointer-events-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl ring-4 backdrop-blur-md ${TONE_RING[speaker.tone]}`}
          >
            <div className="flex items-start gap-4">
              <Portrait speaker={speaker} />
              <div className="min-w-0 flex-1 text-left">
                <p className="font-display text-gold-300 text-2xl tracking-wide">{speaker.name}</p>
                <PendingContent pending={pending} player={player} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PendingContent({ pending, player }: { pending: PendingAction; player: Player }) {
  const { state, resolvePending } = useGame()
  const others = state.players.filter((p) => p.id !== player.id)
  // Texte d'ambiance tiré UNE fois par événement (sinon il changerait à chaque render)
  const flavor = useMemo(
    () => ({
      tree: pickNarrative('TREE_GOOD_PROMPT', { name: player.name }),
      boo: pickNarrative('BOO_INTRO', { name: player.name }),
      shop: pickNarrative('SHOP_WELCOME', { name: player.name }),
      vs: pending.kind === 'VS_WAGER' ? pickNarrative('VS', { amount: pending.amount }) : '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending],
  )

  switch (pending.kind) {
    case 'POPUP':
      return (
        <>
          <p className="text-cream/90 mt-1 text-lg font-bold">{pending.text}</p>
          <div className="mt-3 flex justify-end">
            <BigButton onClick={() => resolvePending({ kind: 'DISMISS' })}>OK ➜</BigButton>
          </div>
        </>
      )

    case 'CHOOSE_SIP_TARGET':
      return (
        <>
          <p className="text-cream/90 mt-1 text-lg font-bold">
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
          <p className="text-cream/90 mt-1 text-lg font-bold">{flavor.tree}</p>
          <div className="mt-3 flex gap-3">
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
          <p className="text-cream/90 mt-1 text-lg font-bold">{flavor.boo}</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <WideButton onClick={() => resolvePending({ kind: 'BOO', action: 'STEAL_COINS' })}>
              🪙 Voler des pièces — gratuit
            </WideButton>
            <WideButton
              disabled={player.coins < state.config.booStarCost || !anyStarTarget}
              onClick={() => resolvePending({ kind: 'BOO', action: 'STEAL_STAR' })}
            >
              ⭐ Voler une Étoile — {state.config.booStarCost} pièces
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
          <p className="text-cream/90 mt-1 text-lg font-bold">
            « Hihihi… je vole {pending.steal === 'STAR' ? 'une Étoile' : 'des pièces'} à qui ? »
          </p>
          <TargetPicker
            targets={valid}
            stat={(t) => (pending.steal === 'STAR' ? `⭐ ${t.stars}` : `🪙 ${t.coins}`)}
            onPick={(id) => resolvePending({ kind: 'BOO_VICTIM', targetId: id })}
          />
        </>
      )
    }

    case 'STAR_PROMPT': {
      const cost = effectiveStarCost(state)
      return (
        <>
          <p className="text-cream/90 mt-1 text-lg font-bold">
            « Une Étoile pour {cost} pièces
            {isFinalRound(state) ? ' — PROMO DERNIÈRE MANCHE, -50 % !' : ''}, ça te dit ? » (tu as{' '}
            {player.coins} 🪙)
          </p>
          <div className="mt-3 flex gap-3">
            <WideButton
              disabled={player.coins < cost}
              onClick={() => resolvePending({ kind: 'STAR', buy: true })}
            >
              ⭐ ACHETER — {cost} 🪙
            </WideButton>
            <WideButton ghost onClick={() => resolvePending({ kind: 'STAR', buy: false })}>
              Plus tard…
            </WideButton>
          </div>
        </>
      )
    }

    case 'VS_WAGER':
      return (
        <>
          <p className="text-cream/90 mt-1 text-lg font-bold">{flavor.vs}</p>
          <div className="mt-3 flex justify-end">
            <BigButton onClick={() => resolvePending({ kind: 'VS_OK' })}>QUE LE MEILLEUR GAGNE !</BigButton>
          </div>
        </>
      )

    case 'MOLE_PROMPT':
      return <MolePrompt cost={pending.cost} player={player} />

    case 'BAD_LUCK_WHEEL':
      return <KamekWheel options={pending.options} resultIndex={pending.resultIndex} player={player} />

    case 'SHOP_PROMPT':
      return (
        <>
          <p className="text-cream/90 mt-1 text-lg font-bold">
            {flavor.shop} <span className="text-cream/55">(tu as {player.coins} 🪙)</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {pending.stock.map((itemId) => {
              const item = ITEMS[itemId]
              const blocked =
                player.coins < item.price || player.inventory.length >= 3
              return (
                <motion.button
                  key={itemId}
                  whileHover={blocked ? undefined : { scale: 1.05, rotate: -1 }}
                  whileTap={blocked ? undefined : { scale: 0.95 }}
                  disabled={blocked}
                  onClick={() => resolvePending({ kind: 'SHOP_BUY', itemId })}
                  className="bg-night-800 hover:bg-night-700 w-44 rounded-2xl p-3 text-left disabled:opacity-40"
                >
                  <span className="flex items-center justify-between">
                    <span className="text-3xl">{item.emoji}</span>
                    <span className="text-gold-300 text-base font-extrabold">{item.price} 🪙</span>
                  </span>
                  <span className="mt-1 block text-sm font-extrabold leading-tight">{item.name}</span>
                  <span className="text-cream/55 block text-[11px] font-semibold leading-tight">
                    {item.description}
                  </span>
                </motion.button>
              )
            })}
          </div>
          {player.inventory.length >= 3 && (
            <p className="mt-2 text-xs font-bold text-red-300/90">Inventaire plein (3 max) !</p>
          )}
          <div className="mt-3 flex justify-end">
            <WideButton ghost onClick={() => resolvePending({ kind: 'SHOP_LEAVE' })}>
              Continuer sa route ➜
            </WideButton>
          </div>
        </>
      )

    case 'WALL_PROMPT':
      return (
        <>
          <p className="text-cream/90 mt-1 text-lg font-bold">
            Un mur de briques te barre la route ! Solidité actuelle :{' '}
            <span className="text-gold-300">{pending.strength}</span>. Lance un dé — il te faut{' '}
            <span className="text-gold-300">≥ {pending.strength}</span> pour le pulvériser, sinon tu
            restes planté là et il s'effrite de 1.
          </p>
          <div className="mt-3 flex justify-end">
            <BigButton onClick={() => resolvePending({ kind: 'WALL_TRY' })}>
              🎲 TENTER LE MUR
            </BigButton>
          </div>
        </>
      )

    case 'GATE_PROMPT': {
      const price = pending.cost.coins
        ? `${pending.cost.coins} pièces 🪙`
        : `${pending.cost.stars} Étoile ⭐`
      const affordable =
        (pending.cost.coins ?? 0) <= player.coins && (pending.cost.stars ?? 0) <= player.stars
      return (
        <>
          <p className="text-cream/90 mt-1 text-lg font-bold">
            Une grille massive te barre le passage. Le gardien réclame son dû :{' '}
            <span className="text-gold-300">{price}</span>.
            {!affordable && (
              <span className="block text-red-300">…et tu n'as pas de quoi payer.</span>
            )}
          </p>
          <div className="mt-3 flex items-center justify-end gap-3">
            <button
              onClick={() => resolvePending({ kind: 'GATE', pay: false })}
              className="bg-night-800 hover:bg-night-700 text-cream/75 rounded-xl px-4 py-2.5 text-sm font-extrabold"
            >
              Hors de question
            </button>
            {affordable && (
              <BigButton onClick={() => resolvePending({ kind: 'GATE', pay: true })}>
                💰 PAYER {price}
              </BigButton>
            )}
          </div>
        </>
      )
    }
  }
}

// ---------- La Roue de Kamek : roulette de sorts ----------

function outcomeLabel(outcome: BadLuckOutcome, player: Player, others: Player[]): string {
  switch (outcome.kind) {
    case 'LOSE_COINS':
      return `💸 Perds ${outcome.amount} pièces`
    case 'LOSE_ITEM': {
      const item = player.inventory[outcome.index]
      return item ? `🎒 Kamek confisque ${ITEMS[item].emoji} ${ITEMS[item].name}` : '🎒 Kamek fouille ton sac'
    }
    case 'GIVE_COINS': {
      const target = others.find((t) => t.id === outcome.targetId)
      return `🪙 Donne ${outcome.amount} pièces à ${target?.name ?? '???'}`
    }
    case 'SIPS':
      return `🍺 Bois ${outcome.amount} gorgées`
    case 'BACK':
      return `↩️ Recule de ${outcome.steps} cases`
  }
}

function KamekWheel({
  options,
  resultIndex,
  player,
}: {
  options: BadLuckOutcome[]
  resultIndex: number
  player: Player
}) {
  const { state, resolvePending } = useGame()
  const others = state.players.filter((p) => p.id !== player.id)
  const labels = options.map((o) => outcomeLabel(o, player, others))
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const timer = useRef(0)

  // La roue tourne vite, décélère, et s'arrête sur le sort pré-tiré.
  useEffect(() => {
    const total = options.length * 3 + resultIndex
    let steps = 0
    let delay = 90
    const tick = () => {
      steps += 1
      setIndex(steps % options.length)
      if (steps >= total) {
        setDone(true)
        return
      }
      if (total - steps < 6) delay += 70
      timer.current = window.setTimeout(tick, delay)
    }
    timer.current = window.setTimeout(tick, delay)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <p className="text-cream/90 mt-1 text-lg font-bold">
        « Héhéhé… voyons quel malheur t'attend, {player.name} ! »
      </p>
      <div className="bg-night-800/90 mt-3 w-full max-w-md overflow-hidden rounded-2xl py-2 shadow-inner ring-1 ring-purple-400/30">
        <p className="text-cream/25 truncate px-4 text-sm font-bold">
          {labels[(index - 1 + labels.length) % labels.length]}
        </p>
        <motion.p
          key={index}
          initial={{ y: 12, opacity: 0.4 }}
          animate={{ y: 0, opacity: 1, scale: done ? 1.06 : 1 }}
          className={`truncate px-4 py-1 text-xl font-extrabold ${done ? 'text-red-300' : ''}`}
        >
          {labels[index]}
        </motion.p>
        <p className="text-cream/25 truncate px-4 text-sm font-bold">
          {labels[(index + 1) % labels.length]}
        </p>
      </div>
      {done && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex justify-end">
          <BigButton onClick={() => resolvePending({ kind: 'BAD_LUCK_DONE' })}>😱 SUBIR SON SORT</BigButton>
        </motion.div>
      )}
    </>
  )
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
      <p className="text-cream/90 mt-1 text-lg font-bold">
        « Pour <span className="text-gold-300">{cost} pièces</span>, j'oriente les panneaux comme tu
        veux ! » (tu as {player.coins} 🪙)
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {SIGNPOST_FORK_IDS.map((forkId, i) => {
          const fork = getSpace(forkId)
          const dir = (directions[forkId] ?? 0) % fork.nextSpaces.length
          const targetId = fork.nextSpaces[dir]
          const target = getSpace(targetId)
          const label =
            fork.branchLabels?.[dir] ?? SPACE_TYPE_LABELS[effectiveSpaceType(state, targetId)]
          return (
            <button
              key={forkId}
              onClick={() => cycle(forkId)}
              className="bg-night-800 hover:bg-night-700 flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-2.5"
            >
              <span className="text-cream/60 text-sm font-extrabold">Panneau {i + 1}</span>
              <span className="ml-auto text-xl">{arrowFor(target.x - fork.x, target.y - fork.y)}</span>
              <span className="text-sm font-extrabold">{label}</span>
              <span className="text-cream/40 text-xs font-bold">↻</span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex gap-3">
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
      className="font-display from-gold-400 to-gold-500 text-night-950 rounded-xl bg-gradient-to-b px-7 py-2.5 text-xl tracking-wider shadow-[0_4px_0_rgba(0,0,0,0.35)]"
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
      className={`rounded-xl px-4 py-2.5 text-base font-extrabold transition-colors disabled:opacity-35 ${
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
      whileHover={{ scale: 1.05, rotate: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-night-800 hover:bg-night-700 flex items-center gap-3 rounded-2xl px-4 py-3"
    >
      <span className="text-4xl">{emoji}</span>
      <span className="text-left">
        <span className="font-display block text-lg">{title}</span>
        <span className="text-cream/60 block text-xs font-bold">{subtitle}</span>
      </span>
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
    <div className="mt-3 flex flex-wrap gap-2.5">
      {targets.map((t) => (
        <motion.button
          key={t.id}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPick(t.id)}
          className="bg-night-800 hover:bg-night-700 flex items-center gap-2.5 rounded-xl px-4 py-2.5"
        >
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.color }} />
          <span className="text-base font-extrabold">{t.name}</span>
          <span className="text-cream/60 text-sm font-bold">{stat(t)}</span>
        </motion.button>
      ))}
    </div>
  )
}
