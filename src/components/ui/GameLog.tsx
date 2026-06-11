// Fil des événements de la partie (bas-gauche), purement informatif.
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../../game/useGameState'

const TONE_CLASS: Record<string, string> = {
  GOOD: 'text-emerald-300',
  BAD: 'text-red-300',
  NEUTRAL: 'text-cream/85',
  SYSTEM: 'text-gold-300',
}

export function GameLog() {
  const { state } = useGame()
  const entries = state.log.slice(-6)
  if (entries.length === 0) return null
  return (
    <div className="bg-night-900/55 pointer-events-none absolute bottom-4 left-4 z-10 w-80 rounded-xl p-3 backdrop-blur-sm">
      <AnimatePresence initial={false}>
        {entries.map((e) => (
          <motion.p
            key={e.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={`text-sm leading-snug font-semibold ${TONE_CLASS[e.tone]}`}
          >
            {e.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  )
}
