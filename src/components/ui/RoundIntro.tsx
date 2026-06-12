// ============================================================
// RoundIntro.tsx — Le récap entre deux manches : pendant que la
// caméra survole le plateau en orbite, un panneau explique ce
// qui vient de changer (règles réelles de Woody Woods) :
//   🪧 les 3 panneaux ont pivoté → nouvelles directions affichées
//   🧱 les murs sont reconstruits
//   🦫 rappel Topi Taupe + ⭐ position de l'Étoile
// ============================================================

import { motion } from 'framer-motion'
import { SIGNPOST_FORK_IDS, getSpace } from '../../game/board'
import { effectiveSpaceType, isFinalRound } from '../../game/reducer'
import { useGame } from '../../game/useGameState'
import { SPACE_TYPE_LABELS, arrowFor } from './labels'

export function RoundIntro() {
  const { state, beginRound } = useGame()

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="bg-night-950/80 pointer-events-auto w-full max-w-xl rounded-3xl p-7 text-center shadow-2xl backdrop-blur-md"
      >
        <p className="text-gold-300/85 text-sm font-extrabold tracking-[0.3em] uppercase">
          Nouvelle manche
        </p>
        <h2 className="font-display text-gold-300 mt-1 text-6xl tracking-wide drop-shadow-[0_4px_0_rgba(0,0,0,0.45)]">
          Manche {state.round}/{state.maxRounds}
        </h2>

        {isFinalRound(state) && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 240 }}
            className="mt-3 rounded-2xl bg-red-500/20 px-4 py-2.5 ring-2 ring-red-400/60"
          >
            <p className="font-display text-2xl tracking-wide text-red-300">🔥 DERNIÈRE MANCHE 🔥</p>
            <p className="text-cream/85 mt-0.5 text-sm font-extrabold">
              L'Étoile est à <span className="text-gold-300">-50 %</span> et les cases rouges font{' '}
              <span className="text-red-300">double dégâts</span>. Tout se joue maintenant !
            </p>
          </motion.div>
        )}

        {/* Les panneaux ont pivoté */}
        <div className="mt-5 text-left">
          <p className="text-cream/85 text-sm font-extrabold tracking-wide uppercase">
            🪧 Les panneaux ont pivoté ! Nouvelles directions :
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {SIGNPOST_FORK_IDS.map((forkId, i) => {
              const fork = getSpace(forkId)
              const dir = (state.signposts[forkId] ?? 0) % fork.nextSpaces.length
              const targetId = fork.nextSpaces[dir]
              const target = getSpace(targetId)
              const label =
                fork.branchLabels?.[dir] ?? SPACE_TYPE_LABELS[effectiveSpaceType(state, targetId)]
              return (
                <motion.div
                  key={forkId}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.18 }}
                  className="bg-night-800/90 flex items-center gap-3 rounded-xl px-4 py-2.5"
                >
                  <span className="bg-gold-400/20 text-gold-300 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold">
                    {i + 1}
                  </span>
                  <span className="text-xl">{arrowFor(target.x - fork.x, target.y - fork.y)}</span>
                  <span className="text-sm font-extrabold">{label}</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Le reste du récap */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-cream/70 mt-4 flex flex-col gap-1 text-left text-xs font-bold"
        >
          <p>▲ Les chevrons sombres sur les chemins indiquent le sens unique ; les tronçons clairs se parcourent dans les deux sens (choix aux carrefours « ? »).</p>
          <p>🧱 Les murs sont reconstruits à pleine solidité.</p>
          {state.cursedSpaceIds.length > 0 && (
            <p className="text-purple-300">
              🔮 Kamek a maudit {state.cursedSpaceIds.length} case
              {state.cursedSpaceIds.length > 1 ? 's' : ''} bleue
              {state.cursedSpaceIds.length > 1 ? 's' : ''}… quelque part. Marchez prudemment.
            </p>
          )}
          <p>🦫 Topi Taupe peut réorienter les panneaux contre quelques pièces, à chaque passage.</p>
          <p>⭐ L'Étoile attend toujours sur sa case (suis le halo doré).</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={beginRound}
          className="font-display from-gold-400 to-gold-500 text-night-950 mt-6 rounded-2xl bg-gradient-to-b px-10 py-3.5 text-2xl tracking-wider shadow-[0_6px_0_rgba(0,0,0,0.35)]"
        >
          🎲 C'EST PARTI !
        </motion.button>
      </motion.div>
    </div>
  )
}
