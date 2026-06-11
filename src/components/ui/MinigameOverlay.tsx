// ============================================================
// MinigameOverlay.tsx — La séquence minijeu : roulette de
// catégorie, roulette de jeu, puis écran « jouez en vrai ».
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CHARACTERS, MINIGAME_CATEGORIES } from '../../game/constants'
import type { PlayerId } from '../../game/types'
import { useGame } from '../../game/useGameState'

export function MinigameOverlay() {
  const { state } = useGame()
  const mg = state.minigame
  const visible =
    !!mg &&
    (state.phase === 'MINIGAME_CATEGORY' ||
      state.phase === 'MINIGAME_TITLE' ||
      state.phase === 'MINIGAME_PLAY')

  return (
    <AnimatePresence>
      {visible && mg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="from-night-950/92 to-night-900/92 absolute inset-0 z-20 grid place-items-center bg-gradient-to-b p-8 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl text-center">
            <p className="text-gold-300/85 text-lg font-extrabold tracking-[0.3em] uppercase">
              {mg.context === 'VS' ? `⚔️ Duel VS — pot de ${mg.pot} pièces` : '🎉 Minijeu de fin de manche'}
            </p>
            {state.phase === 'MINIGAME_CATEGORY' && <CategoryStage key="cat" />}
            {state.phase === 'MINIGAME_TITLE' && <TitleStage key="title" />}
            {state.phase === 'MINIGAME_PLAY' && <PlayStage key="play" />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- Étape 1 : la catégorie ----------

function CategoryStage() {
  const { state, spinCategory, spinTitle } = useGame()
  const category = state.minigame?.category ?? null
  const [settled, setSettled] = useState(false)

  return (
    <div>
      <h2 className="font-display mt-2 text-5xl tracking-wide">La Roulette des Catégories</h2>
      {!category ? (
        <SpinButton onClick={spinCategory}>🎰 TIRER LA CATÉGORIE</SpinButton>
      ) : (
        <>
          <RouletteSpinner
            items={[...MINIGAME_CATEGORIES]}
            targetIndex={MINIGAME_CATEGORIES.indexOf(category)}
            onSettled={() => setSettled(true)}
          />
          {settled && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-2xl font-extrabold">
                Catégorie : <span className="text-gold-300">{category}</span> !
              </p>
              <TeamsBanner />
              <SpinButton onClick={spinTitle}>➜ ROULETTE DES JEUX</SpinButton>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

// ---------- Étape 2 : le jeu ----------

function TitleStage() {
  const { state, spinTitle, goPlay } = useGame()
  const mg = state.minigame!
  const [settled, setSettled] = useState(false)
  const items = mg.category ? state.config.minigames[mg.category] : []

  return (
    <div>
      <h2 className="font-display mt-2 text-5xl tracking-wide">
        Jeux <span className="text-gold-300">{mg.category}</span>
      </h2>
      {!mg.title ? (
        <SpinButton onClick={spinTitle}>🎰 TIRER LE JEU</SpinButton>
      ) : (
        <>
          <RouletteSpinner
            items={items}
            targetIndex={Math.max(0, items.indexOf(mg.title))}
            onSettled={() => setSettled(true)}
          />
          {settled && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-2xl font-extrabold">
                Ce sera : <span className="text-gold-300">{mg.title}</span> !
              </p>
              <SpinButton onClick={goPlay}>🔥 C'EST PARTI !</SpinButton>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

// ---------- Étape 3 : on joue en vrai ----------

function PlayStage() {
  const { state, goPodium } = useGame()
  const mg = state.minigame!
  return (
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
      <p className="bg-gold-400/15 text-gold-300 mx-auto mt-4 w-fit rounded-full px-4 py-1 text-sm font-extrabold tracking-widest uppercase">
        {mg.category}
      </p>
      <h2 className="font-display mt-3 animate-float text-6xl tracking-wide drop-shadow-[0_4px_0_rgba(0,0,0,0.4)]">
        {mg.title}
      </h2>
      <p className="text-cream/80 mx-auto mt-5 max-w-md text-xl font-bold">
        Jouez le minijeu <span className="text-gold-300">en vrai</span> ! Quand c'est terminé, le
        Game Master saisit le classement.
      </p>
      {mg.context === 'VS' && (
        <p className="mt-2 text-lg font-extrabold text-fuchsia-300">💰 {mg.pot} pièces en jeu !</p>
      )}
      <TeamsBanner />
      <SpinButton onClick={goPodium}>📋 SAISIR LE {mg.teams ? 'RÉSULTAT' : 'PODIUM'}</SpinButton>
    </motion.div>
  )
}

// ---------- Équipes tirées automatiquement (1v1 / 2v2) ----------

function TeamsBanner() {
  const { state } = useGame()
  const mg = state.minigame
  if (!mg?.teams) return null
  const playing = new Set(mg.teams.flat())
  const spectators = state.players.filter((p) => !playing.has(p.id))

  const TeamChips = ({ ids }: { ids: PlayerId[] }) => (
    <span className="inline-flex items-center gap-2">
      {ids.map((id) => {
        const p = state.players.find((pl) => pl.id === id)!
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-extrabold"
            style={{ backgroundColor: p.color, color: '#14101f' }}
          >
            {CHARACTERS[p.character].emoji} {p.name}
          </span>
        )
      })}
    </span>
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="mt-5"
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <TeamChips ids={mg.teams[0]} />
        <span className="font-display text-gold-300 text-2xl">VS</span>
        <TeamChips ids={mg.teams[1]} />
      </div>
      {spectators.length > 0 && (
        <p className="text-cream/55 mt-2 text-sm font-bold">
          👀 Spectateurs : {spectators.map((p) => p.name).join(' & ')}
        </p>
      )}
    </motion.div>
  )
}

// ---------- Composants partagés ----------

function SpinButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="font-display from-gold-400 to-gold-500 text-night-950 mt-8 rounded-2xl bg-gradient-to-b px-9 py-4 text-2xl tracking-wider shadow-[0_6px_0_rgba(0,0,0,0.35)]"
    >
      {children}
    </motion.button>
  )
}

interface SpinnerProps {
  items: string[]
  targetIndex: number
  onSettled: () => void
}

/** Roue façon machine à sous : défile vite, décélère, s'arrête sur la cible. */
function RouletteSpinner({ items, targetIndex, onSettled }: SpinnerProps) {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const settledRef = useRef(onSettled)
  settledRef.current = onSettled

  useEffect(() => {
    const total = items.length * 3 + targetIndex
    let steps = 0
    let delay = 70
    let timer = 0
    const tick = () => {
      steps += 1
      setIndex(steps % items.length)
      if (steps >= total) {
        setDone(true)
        settledRef.current()
        return
      }
      if (total - steps < 8) delay += 55
      timer = window.setTimeout(tick, delay)
    }
    timer = window.setTimeout(tick, delay)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prev = items[(index - 1 + items.length) % items.length]
  const next = items[(index + 1) % items.length]

  return (
    <div className="bg-night-800/80 mx-auto mt-6 w-full max-w-md overflow-hidden rounded-2xl py-4 shadow-inner">
      <p className="text-cream/25 truncate px-4 text-lg font-bold">{prev}</p>
      <motion.p
        key={index}
        initial={{ y: 14, opacity: 0.4 }}
        animate={{ y: 0, opacity: 1, scale: done ? 1.08 : 1 }}
        className={`font-display truncate px-4 py-1 text-4xl tracking-wide ${done ? 'text-gold-300' : ''}`}
      >
        {items[index]}
      </motion.p>
      <p className="text-cream/25 truncate px-4 text-lg font-bold">{next}</p>
    </div>
  )
}
