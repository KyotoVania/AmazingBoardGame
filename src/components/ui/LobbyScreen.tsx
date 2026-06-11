// ============================================================
// LobbyScreen.tsx — Configuration des 4 équipes : nom, couleur,
// personnage (= dé perso du wiki SMP) + nombre de manches.
// ============================================================

import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  CHARACTERS,
  CHARACTER_IDS,
  DEFAULT_LOBBY,
  DEFAULT_ROUNDS,
  DICE_BLOCKS,
  PLAYER_COLORS,
  ROUND_OPTIONS,
} from '../../game/constants'
import type { LobbyPlayerConfig } from '../../game/types'
import { useGame } from '../../game/useGameState'

export function LobbyScreen() {
  const { startGame } = useGame()
  const [configs, setConfigs] = useState<LobbyPlayerConfig[]>(() =>
    DEFAULT_LOBBY.map((c) => ({ ...c })),
  )
  const [rounds, setRounds] = useState<number>(DEFAULT_ROUNDS)

  const patch = (i: number, p: Partial<LobbyPlayerConfig>) => {
    setConfigs((prev) => prev.map((c, j) => (j === i ? { ...c, ...p } : c)))
  }

  return (
    <div className="relative flex h-full flex-col items-center overflow-y-auto px-8 py-6">
      {/* fond décoratif */}
      <div className="from-night-800/60 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />

      <motion.header
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center"
      >
        <p className="text-gold-300/80 text-lg font-extrabold tracking-[0.35em] uppercase">
          Amazing Board Game
        </p>
        <h1 className="font-display text-gold-300 text-6xl tracking-wide drop-shadow-[0_4px_0_rgba(0,0,0,0.45)]">
          🌲 Woody Woods Party 🍻
        </h1>
        <p className="text-cream/70 mt-1 font-semibold">
          4 équipes · des dés · des gorgées · une Étoile à chasser
        </p>
      </motion.header>

      <div className="relative z-10 mt-6 grid w-full max-w-6xl grid-cols-2 gap-4">
        {configs.map((cfg, i) => (
          <PlayerConfigCard key={i} index={i} config={cfg} onPatch={(p) => patch(i, p)} />
        ))}
      </div>

      <motion.footer
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 mt-6 flex items-center gap-6 pb-4"
      >
        <div className="bg-night-900/80 flex items-center gap-1 rounded-full p-1.5 backdrop-blur-sm">
          <span className="text-cream/60 px-3 text-sm font-extrabold uppercase">Manches</span>
          {ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setRounds(n)}
              className={`rounded-full px-4 py-1.5 text-sm font-extrabold transition-colors ${
                rounds === n ? 'bg-gold-400 text-night-950' : 'text-cream/70 hover:bg-night-800'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => startGame(configs, rounds)}
          className="font-display from-gold-400 to-gold-500 text-night-950 rounded-2xl bg-gradient-to-b px-10 py-4 text-3xl tracking-wider shadow-[0_6px_0_rgba(0,0,0,0.35)]"
        >
          🎲 LANCER LA PARTIE
        </motion.button>
      </motion.footer>
    </div>
  )
}

interface CardProps {
  index: number
  config: LobbyPlayerConfig
  onPatch: (p: Partial<LobbyPlayerConfig>) => void
}

function PlayerConfigCard({ index, config, onPatch }: CardProps) {
  const dice = DICE_BLOCKS[config.character]
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-night-900/80 rounded-2xl p-4 shadow-xl backdrop-blur-sm"
      style={{ borderTop: `5px solid ${config.color}` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl"
          style={{ backgroundColor: config.color }}
        >
          {CHARACTERS[config.character].emoji}
        </div>
        <input
          value={config.name}
          maxLength={18}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder={`Équipe ${index + 1}`}
          className="bg-night-800 focus:ring-gold-400 w-full rounded-lg px-3 py-2 font-extrabold outline-none focus:ring-2"
        />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-cream/50 mr-1 text-xs font-extrabold uppercase">Couleur</span>
        {PLAYER_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onPatch({ color: c })}
            aria-label={`couleur ${c}`}
            className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
              config.color === c ? 'ring-3 ring-cream scale-110' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="mt-3">
        <span className="text-cream/50 text-xs font-extrabold uppercase">
          Personnage · son dé remplace le dé normal si tu veux
        </span>
        <div className="mt-1.5 grid grid-cols-10 gap-1">
          {CHARACTER_IDS.map((id) => (
            <button
              key={id}
              title={`${CHARACTERS[id].name} — dé : ${DICE_BLOCKS[id].faces
                .map((f) => f.value)
                .join(' · ')}`}
              onClick={() => onPatch({ character: id })}
              className={`grid h-8 w-8 place-items-center rounded-lg text-base transition-colors ${
                config.character === id
                  ? 'bg-gold-400/90 scale-105'
                  : 'bg-night-800 hover:bg-night-700'
              }`}
            >
              {CHARACTERS[id].emoji}
            </button>
          ))}
        </div>
        <div className="text-cream/70 mt-2 flex flex-wrap items-center gap-1 text-xs font-bold">
          <span className="text-gold-300">{dice.label} :</span>
          {dice.faces.map((f, i) => (
            <span key={i} className="bg-night-800 rounded px-1.5 py-0.5">
              {f.value}
              {f.coins ? (
                <span className={f.coins > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {f.coins > 0 ? `+${f.coins}🪙` : `${f.coins}🪙`}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
