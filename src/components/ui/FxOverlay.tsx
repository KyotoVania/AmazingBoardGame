// ============================================================
// FxOverlay.tsx — Les effets visuels one-shot du jeu, déclenchés
// par state.fx. Chaque type a sa propre mise en scène :
//   STEAL_COINS  pluie de pièces en arc, victime secouée
//   STEAL_STAR   l'Étoile file avec une traînée d'étincelles
//   STAR_BUY     explosion de confettis + Étoile géante
//   WALL_BREAK   mur de briques pulvérisé + secousse d'écran
//   PIT_FALL     le joueur dégringole dans le trou
//   SIPS         trinquée de chopes + mousse
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { FxEvent } from '../../game/types'
import { useGame } from '../../game/useGameState'

const DURATIONS: Record<FxEvent['kind'], number> = {
  STEAL_COINS: 2400,
  STEAL_STAR: 2600,
  STAR_BUY: 2800,
  WALL_BREAK: 2200,
  PIT_FALL: 2200,
  SIPS: 2200,
}

export function FxOverlay() {
  const { state } = useGame()
  const [active, setActive] = useState<FxEvent | null>(null)

  useEffect(() => {
    if (!state.fx) return
    setActive(state.fx)
    const t = setTimeout(() => setActive(null), DURATIONS[state.fx.kind])
    return () => clearTimeout(t)
  }, [state.fx?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-40"
        >
          {active.kind === 'STEAL_COINS' && <StealFx fx={active} star={false} />}
          {active.kind === 'STEAL_STAR' && <StealFx fx={active} star />}
          {active.kind === 'STAR_BUY' && <StarBuyFx fx={active} />}
          {active.kind === 'WALL_BREAK' && <WallBreakFx fx={active} />}
          {active.kind === 'PIT_FALL' && <PitFallFx fx={active} />}
          {active.kind === 'SIPS' && <SipsFx fx={active} />}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- Briques communes ----------

function Veil({ opacity = 0.4 }: { opacity?: number }) {
  return <div className="bg-night-950 absolute inset-0" style={{ opacity }} />
}

function NameTag({ name, color, shake, pop }: { name: string; color: string; shake?: boolean; pop?: boolean }) {
  return (
    <motion.div
      animate={shake ? { x: [0, -8, 8, -6, 6, 0], rotate: [0, -2, 2, 0] } : pop ? { scale: [1, 1.18, 1] } : undefined}
      transition={{ duration: 0.6, delay: shake ? 0.15 : 1.15 }}
      className="font-display rounded-2xl px-6 py-3 text-2xl shadow-[0_5px_0_rgba(0,0,0,0.4)]"
      style={{ backgroundColor: color, color: '#14101f' }}
    >
      {name}
    </motion.div>
  )
}

function Legend({ children, delay = 0.3 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.p
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring' }}
      className="font-display absolute bottom-[24%] left-1/2 w-full -translate-x-1/2 text-center text-3xl tracking-wide drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]"
    >
      {children}
    </motion.p>
  )
}

// ---------- Vols (pièces / Étoile) ----------

function StealFx({ fx, star }: { fx: FxEvent; star: boolean }) {
  const projectiles = star ? 1 : 10
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Veil />
      <div className="relative flex w-full max-w-3xl items-center justify-between px-16">
        <NameTag name={fx.fromName} color={fx.fromColor} shake />
        <NameTag name={fx.toName} color={fx.toColor} pop />
        {Array.from({ length: projectiles }, (_, i) => (
          <Arc key={i} emoji={star ? '⭐' : '🪙'} index={i} total={projectiles} big={star} />
        ))}
        {star &&
          Array.from({ length: 7 }, (_, i) => (
            <Arc key={`s${i}`} emoji="✨" index={i} total={7} trail />
          ))}
      </div>
      <Legend>
        {star
          ? `⭐ ${fx.toName} vole une ÉTOILE à ${fx.fromName} !`
          : `🪙 ${fx.toName} vole ${fx.amount ?? ''} pièces à ${fx.fromName} !`}
      </Legend>
    </div>
  )
}

/** Un projectile en arc, de la pastille de gauche vers celle de droite. */
function Arc({ emoji, index, total, big, trail }: { emoji: string; index: number; total: number; big?: boolean; trail?: boolean }) {
  const delay = (trail ? 0.3 : 0.15) + (index / total) * 0.65
  const arcH = -70 - (index % 4) * 38
  return (
    <motion.span
      initial={{ left: '12%', top: '50%', opacity: 0, scale: 0.4 }}
      animate={{
        left: ['12%', '50%', '84%'],
        top: ['50%', `calc(50% + ${arcH}px)`, '50%'],
        opacity: trail ? [0, 0.9, 0] : [0, 1, 1, 0],
        scale: big ? [0.6, 1.8, 1] : [0.5, 1.15, 0.8],
        rotate: [0, 220, 400],
      }}
      transition={{ duration: 1.15, delay, ease: 'easeInOut' }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${big ? 'text-6xl' : trail ? 'text-xl' : 'text-3xl'} drop-shadow-lg`}
    >
      {emoji}
    </motion.span>
  )
}

// ---------- Achat d'Étoile : la célébration ----------

const CONFETTI = ['🎉', '✨', '⭐', '🎊', '💛']

function StarBuyFx({ fx }: { fx: FxEvent }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Veil opacity={0.5} />
      {/* rayons */}
      <motion.div
        initial={{ scale: 0, rotate: 0, opacity: 0.9 }}
        animate={{ scale: 2.4, rotate: 90, opacity: 0 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="absolute text-[14rem]"
      >
        ✴️
      </motion.div>
      {/* l'Étoile géante */}
      <motion.div
        initial={{ scale: 0, y: 80 }}
        animate={{ scale: [0, 1.5, 1.2], y: 0, rotate: [0, -12, 8, 0] }}
        transition={{ duration: 0.9, type: 'spring', stiffness: 180 }}
        className="relative text-[9rem] drop-shadow-[0_0_40px_rgba(246,194,68,0.9)]"
      >
        ⭐
      </motion.div>
      {/* confettis */}
      {Array.from({ length: 18 }, (_, i) => {
        const x = (i / 18) * 100
        return (
          <motion.span
            key={i}
            initial={{ left: `${x}%`, top: '-8%', rotate: 0, opacity: 1 }}
            animate={{ top: '108%', rotate: 360 + (i % 3) * 180, opacity: [1, 1, 0.6] }}
            transition={{ duration: 1.9 + (i % 5) * 0.18, delay: 0.15 + (i % 7) * 0.07, ease: 'easeIn' }}
            className="absolute text-3xl"
          >
            {CONFETTI[i % CONFETTI.length]}
          </motion.span>
        )
      })}
      <Legend delay={0.55}>
        <span style={{ color: fx.toColor }}>{fx.toName}</span> achète une ÉTOILE !
      </Legend>
    </div>
  )
}

// ---------- Mur pulvérisé ----------

function WallBreakFx({ fx }: { fx: FxEvent }) {
  return (
    <motion.div
      animate={{ x: [0, -10, 10, -7, 7, -3, 3, 0], y: [0, 6, -6, 4, -4, 0] }}
      transition={{ duration: 0.7, delay: 0.25 }}
      className="absolute inset-0 flex items-center justify-center"
    >
      <Veil />
      {/* flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute inset-0 bg-amber-200"
      />
      {/* le mur qui explose */}
      <div className="relative grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }, (_, i) => {
          const dx = ((i % 3) - 1) * (140 + (i % 2) * 80)
          const dy = (Math.floor(i / 3) - 1) * 120 - 60
          return (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: dx, y: [0, dy, dy + 260], rotate: dx * 2, opacity: [1, 1, 0] }}
              transition={{ duration: 1.4, delay: 0.25, ease: 'easeOut' }}
              className="text-5xl"
            >
              🧱
            </motion.span>
          )
        })}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: [0, 2.2, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl"
        >
          💥
        </motion.span>
      </div>
      <Legend delay={0.6}>
        💪 <span style={{ color: fx.toColor }}>{fx.toName}</span> PULVÉRISE le mur
        {fx.amount ? ` avec un ${fx.amount}` : ''} !
      </Legend>
    </motion.div>
  )
}

// ---------- Chute dans le trou ----------

function PitFallFx({ fx }: { fx: FxEvent }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Veil />
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ y: -180, rotate: 0, scale: 1 }}
          animate={{ y: 40, rotate: [0, 15, -20, 30], scale: [1, 1, 0.25], opacity: [1, 1, 0] }}
          transition={{ duration: 1.3, delay: 0.2, ease: 'easeIn' }}
        >
          <NameTag name={fx.toName} color={fx.toColor} />
        </motion.div>
        <span className="-mt-4 text-8xl">🕳️</span>
        {/* poussière */}
        {Array.from({ length: 5 }, (_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 0, x: (i - 2) * 8 }}
            animate={{ opacity: [0, 0.8, 0], y: -36 - i * 7, x: (i - 2) * 34 }}
            transition={{ duration: 0.8, delay: 1.3 + i * 0.05 }}
            className="absolute bottom-10 text-2xl"
          >
            💨
          </motion.span>
        ))}
      </div>
      <Legend delay={1.4}>
        🕳️ <span style={{ color: fx.toColor }}>{fx.toName}</span> tombe dans LE TROU !
      </Legend>
    </div>
  )
}

// ---------- Gorgées ----------

function SipsFx({ fx }: { fx: FxEvent }) {
  const selfDrink = fx.fromName === fx.toName
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Veil />
      <div className="relative flex items-end justify-center">
        <motion.span
          initial={{ rotate: -35, x: -42 }}
          animate={{ rotate: [-35, 12, -8, 0], x: [-42, -7, -10] }}
          transition={{ duration: 0.9, delay: 0.15, type: 'spring', stiffness: 200 }}
          className="text-8xl"
        >
          🍺
        </motion.span>
        <motion.span
          initial={{ rotate: 35, x: 42, scaleX: -1 }}
          animate={{ rotate: [35, -12, 8, 0], x: [42, 7, 10] }}
          transition={{ duration: 0.9, delay: 0.15, type: 'spring', stiffness: 200 }}
          className="text-8xl"
        >
          🍺
        </motion.span>
        {/* mousse au choc */}
        {Array.from({ length: 6 }, (_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 0, x: (i - 2.5) * 6, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], y: -70 - (i % 3) * 26, x: (i - 2.5) * 26, scale: 1.15 }}
            transition={{ duration: 0.9, delay: 0.75 + i * 0.05 }}
            className="absolute top-2 text-3xl"
          >
            🫧
          </motion.span>
        ))}
        {/* compteur de gorgées */}
        <motion.span
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: [0, 1.6, 1.2], y: -110 }}
          transition={{ duration: 0.9, delay: 0.8, type: 'spring' }}
          className="font-display absolute text-5xl text-amber-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]"
        >
          ×{fx.amount ?? 1}
        </motion.span>
      </div>
      <Legend delay={0.9}>
        {selfDrink ? (
          <>
            🍺 <span style={{ color: fx.toColor }}>{fx.toName}</span> boit {fx.amount} gorgée
            {(fx.amount ?? 0) > 1 ? 's' : ''} !
          </>
        ) : (
          <>
            🍻 <span style={{ color: fx.fromColor }}>{fx.fromName}</span> offre {fx.amount} gorgée
            {(fx.amount ?? 0) > 1 ? 's' : ''} à <span style={{ color: fx.toColor }}>{fx.toName}</span> !
          </>
        )}
      </Legend>
    </div>
  )
}
