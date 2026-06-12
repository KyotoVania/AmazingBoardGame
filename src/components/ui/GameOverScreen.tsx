// ============================================================
// GameOverScreen.tsx — Classement final (étoiles puis pièces),
// statistiques gorgées et bouton rejouer.
// ============================================================

import { motion } from 'framer-motion'
import { CHARACTERS } from '../../game/constants'
import type { Player } from '../../game/types'
import { useGame } from '../../game/useGameState'

interface Award {
  emoji: string
  title: string
  player: Player
  value: string
  snark: string
}

/** Les Titres de la soirée : superlatifs calculés sur les compteurs. */
function computeAwards(players: Player[]): Award[] {
  const maxBy = (fn: (p: Player) => number) =>
    [...players].sort((a, b) => fn(b) - fn(a))[0]
  const minBy = (fn: (p: Player) => number) =>
    [...players].sort((a, b) => fn(a) - fn(b))[0]
  const st = (p: Player) => p.stats ?? { itemsUsed: 0, pitFalls: 0, wallsBroken: 0 }

  const awards: Award[] = []
  const sponge = maxBy((p) => p.sipsTaken)
  awards.push({
    emoji: '🧽',
    title: "L'Éponge d'or",
    player: sponge,
    value: `${sponge.sipsTaken} gorgées bues`,
    snark: 'Ton foie a porté cette soirée.',
  })
  const dealer = maxBy((p) => p.sipsGiven)
  awards.push({
    emoji: '🍻',
    title: 'Le Dealer',
    player: dealer,
    value: `${dealer.sipsGiven} gorgées distribuées`,
    snark: "Généreux, mais pas avec ce qu'il faut.",
  })
  const rich = maxBy((p) => p.coins)
  awards.push({
    emoji: '🤑',
    title: 'Le Picsou',
    player: rich,
    value: `${rich.coins} pièces au compteur`,
    snark: 'Radin un jour, radin toujours.',
  })
  const broke = minBy((p) => p.coins)
  if (broke.id !== rich.id) {
    awards.push({
      emoji: '🪫',
      title: 'Le Fauché',
      player: broke,
      value: `${broke.coins} pièces restantes`,
      snark: "Même le jeu n'a pas voulu de toi.",
    })
  }
  const digger = maxBy((p) => st(p).pitFalls)
  if (st(digger).pitFalls > 0) {
    awards.push({
      emoji: '🕳️',
      title: 'Le Spéléologue',
      player: digger,
      value: `${st(digger).pitFalls} chute${st(digger).pitFalls > 1 ? 's' : ''} dans le trou`,
      snark: 'Le fond, tu connais.',
    })
  }
  const wrecker = maxBy((p) => st(p).wallsBroken)
  if (st(wrecker).wallsBroken > 0) {
    awards.push({
      emoji: '💥',
      title: 'Le Démolisseur',
      player: wrecker,
      value: `${st(wrecker).wallsBroken} mur${st(wrecker).wallsBroken > 1 ? 's' : ''} pulvérisé${st(wrecker).wallsBroken > 1 ? 's' : ''}`,
      snark: 'Les portes, ça existe pourtant.',
    })
  }
  const consumer = maxBy((p) => st(p).itemsUsed)
  if (st(consumer).itemsUsed > 0) {
    awards.push({
      emoji: '🧪',
      title: 'Le Consommateur',
      player: consumer,
      value: `${st(consumer).itemsUsed} item${st(consumer).itemsUsed > 1 ? 's' : ''} utilisé${st(consumer).itemsUsed > 1 ? 's' : ''}`,
      snark: 'Aucune modération, comme pour le reste.',
    })
  }
  return awards
}

export function GameOverScreen() {
  const { state, restart } = useGame()
  const standings = [...state.players].sort(
    (a, b) => b.stars - a.stars || b.coins - a.coins,
  )
  const winners = state.winners ?? []
  const awards = computeAwards(state.players)

  return (
    <div className="from-night-950 to-night-900 absolute inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b p-8">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        className="text-center"
      >
        <p className="text-gold-300/80 text-xl font-extrabold tracking-[0.35em] uppercase">
          Fin de partie
        </p>
        <h2 className="font-display text-gold-300 mt-1 animate-float text-7xl tracking-wide drop-shadow-[0_5px_0_rgba(0,0,0,0.45)]">
          👑 {standings
            .filter((p) => winners.includes(p.id))
            .map((p) => p.name)
            .join(' & ') || '???'}
        </h2>
        <p className="text-cream/80 mt-2 text-2xl font-bold">
          remporte{winners.length > 1 ? 'nt' : ''} la Super Étoile de Woody Woods !
        </p>
      </motion.div>

      <div className="mt-8 flex w-full max-w-xl flex-col gap-2.5">
        {standings.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${
              winners.includes(p.id) ? 'bg-gold-400/15 ring-2 ring-gold-400/60' : 'bg-night-800/80'
            }`}
            style={{ borderLeft: `5px solid ${p.color}` }}
          >
            <span className="font-display w-8 text-2xl">{i + 1}.</span>
            <span className="text-xl">{CHARACTERS[p.character].emoji}</span>
            <span className="text-lg font-extrabold">{p.name}</span>
            <span className="ml-auto flex gap-4 text-lg font-extrabold">
              <span>⭐ {p.stars}</span>
              <span>🪙 {p.coins}</span>
              <span className="text-cream/60">🍺 {p.sipsTaken}</span>
            </span>
          </motion.div>
        ))}
      </div>

      {/* 🏆 La cérémonie des Titres de la soirée */}
      <div className="mt-7 w-full max-w-4xl">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-gold-300/85 text-center text-sm font-extrabold tracking-[0.3em] uppercase"
        >
          🏆 Les Titres de la soirée 🏆
        </motion.p>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {awards.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 24, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 1.1 + i * 0.25, type: 'spring', stiffness: 220 }}
              className="bg-night-800/90 rounded-2xl px-4 py-3 text-center shadow-lg"
              style={{ borderTop: `4px solid ${a.player.color}` }}
            >
              <span className="text-3xl">{a.emoji}</span>
              <p className="font-display text-gold-300 text-lg leading-tight">{a.title}</p>
              <p className="text-base font-extrabold" style={{ color: a.player.color }}>
                {a.player.name}
              </p>
              <p className="text-cream/70 text-xs font-bold">{a.value}</p>
              <p className="text-cream/45 mt-0.5 text-[11px] font-semibold italic">{a.snark}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={restart}
        className="font-display from-gold-400 to-gold-500 text-night-950 mt-8 rounded-2xl bg-gradient-to-b px-10 py-4 text-2xl tracking-wider shadow-[0_6px_0_rgba(0,0,0,0.35)]"
      >
        ↺ REJOUER
      </motion.button>
    </div>
  )
}
