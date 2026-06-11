// ============================================================
// ConfigPanel.tsx — Le panneau de configuration :
//   · au LOBBY : règles du jeu + tables de minijeux + modèles 3D
//   · EN PARTIE (mode DEBUG) : mêmes onglets, à chaud
// Onglet « Modèles 3D » : chaque pion peut recevoir un .glb,
// soit uploadé (objectURL), soit servi depuis public/models/
// (chemin /models/mon-pion.glb).
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { CHARACTERS } from '../../game/constants'
import type { GameConfig, MinigameCategory, PlayerId } from '../../game/types'
import { useGame } from '../../game/useGameState'
import { useModels, type ModelSlot } from '../three/Models'

type Tab = 'RULES' | 'MINIGAMES' | 'MODELS'

const PLAYER_SLOTS: PlayerId[] = ['P1', 'P2', 'P3', 'P4']

export function ConfigPanel({ onClose }: { onClose: () => void }) {
  const { state } = useGame()
  const [tab, setTab] = useState<Tab>('RULES')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-40 grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-night-900/95 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 shadow-2xl ring-4 ring-gold-400/40"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-gold-300 text-3xl tracking-wide">⚙️ Configuration</h2>
            <button onClick={onClose} className="text-cream/60 hover:text-cream text-xl font-bold">✕</button>
          </div>
          {state.phase !== 'LOBBY' && (
            <p className="mt-1 text-xs font-bold text-red-300/90">
              Partie en cours — modifications à chaud (God Mode), à manier avec soin.
            </p>
          )}

          {/* Onglets */}
          <div className="bg-night-800 mt-4 flex gap-1 rounded-xl p-1">
            {(
              [
                ['RULES', '🎲 Règles'],
                ['MINIGAMES', '🎰 Minijeux'],
                ['MODELS', '🧸 Modèles 3D'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-extrabold transition-colors ${
                  tab === id ? 'bg-gold-400 text-night-950' : 'text-cream/70 hover:bg-night-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === 'RULES' && <RulesTab />}
            {tab === 'MINIGAMES' && <MinigamesTab />}
            {tab === 'MODELS' && <ModelsTab />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ---------- Onglet Règles ----------

const RULE_FIELDS: { key: keyof Omit<GameConfig, 'minigames'>; label: string; hint: string }[] = [
  { key: 'blueCoins', label: '🔵 Case bleue', hint: 'pièces gagnées' },
  { key: 'redCoins', label: '🔴 Case rouge', hint: 'pièces perdues' },
  { key: 'starCost', label: '⭐ Prix de l’Étoile', hint: 'chez Toadette' },
  { key: 'booStarCost', label: '👻 Vol d’Étoile', hint: 'tarif de Boo' },
  { key: 'sipPlus', label: '🍺 Case gorgées', hint: 'gorgées bues' },
  { key: 'sipMinus', label: '🍻 Case distribution', hint: 'gorgées offertes' },
  { key: 'pitEscapeMin', label: '🕳️ Sortie du trou', hint: 'lancer minimum' },
  { key: 'wallStrength', label: '🧱 Solidité du mur', hint: 'au début de manche' },
]

function RulesTab() {
  const { state, setConfig } = useGame()
  const [draft, setDraft] = useState<Record<string, number>>(() => {
    const d: Record<string, number> = {}
    for (const f of RULE_FIELDS) d[f.key] = state.config[f.key]
    return d
  })
  const dirty = RULE_FIELDS.some((f) => draft[f.key] !== state.config[f.key])

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {RULE_FIELDS.map((f) => (
          <label key={f.key} className="bg-night-800/80 flex items-center gap-3 rounded-xl px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{f.label}</span>
              <span className="text-cream/50 block text-xs font-semibold">{f.hint}</span>
            </span>
            <input
              type="number"
              min={0}
              value={draft[f.key]}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: Number(e.target.value) }))}
              className="bg-night-900 focus:ring-gold-400 w-20 rounded-lg px-2 py-1.5 text-center font-extrabold outline-none focus:ring-2"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={() => {
            const d: Record<string, number> = {}
            for (const f of RULE_FIELDS) d[f.key] = state.config[f.key]
            setDraft(d)
          }}
          className="bg-night-800 text-cream/75 hover:bg-night-700 rounded-xl px-4 py-2 text-sm font-extrabold"
        >
          Réinitialiser
        </button>
        <button
          disabled={!dirty}
          onClick={() => setConfig(draft)}
          className="from-gold-400 to-gold-500 text-night-950 rounded-xl bg-gradient-to-b px-5 py-2 text-sm font-extrabold disabled:opacity-35"
        >
          ✅ Appliquer
        </button>
      </div>
    </div>
  )
}

// ---------- Onglet Minijeux ----------

const CATEGORIES: MinigameCategory[] = ['FFA', '1v1', '2v2']

function MinigamesTab() {
  const { state, setConfig } = useGame()
  const [draft, setDraft] = useState<Record<MinigameCategory, string>>(() => ({
    FFA: state.config.minigames.FFA.join('\n'),
    '1v1': state.config.minigames['1v1'].join('\n'),
    '2v2': state.config.minigames['2v2'].join('\n'),
  }))

  const apply = () => {
    setConfig({
      minigames: {
        FFA: draft.FFA.split('\n').map((l) => l.trim()).filter(Boolean),
        '1v1': draft['1v1'].split('\n').map((l) => l.trim()).filter(Boolean),
        '2v2': draft['2v2'].split('\n').map((l) => l.trim()).filter(Boolean),
      },
    })
  }

  return (
    <div>
      <p className="text-cream/60 text-xs font-bold">Un minijeu par ligne. La roulette pioche dans ces listes.</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => (
          <label key={cat} className="block">
            <span className="text-gold-300 text-sm font-extrabold">{cat}</span>
            <textarea
              value={draft[cat]}
              onChange={(e) => setDraft((d) => ({ ...d, [cat]: e.target.value }))}
              rows={9}
              className="bg-night-800 focus:ring-gold-400 mt-1 w-full resize-none rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={apply}
          className="from-gold-400 to-gold-500 text-night-950 rounded-xl bg-gradient-to-b px-5 py-2 text-sm font-extrabold"
        >
          ✅ Appliquer
        </button>
      </div>
    </div>
  )
}

// ---------- Onglet Modèles 3D (.glb) ----------

function ModelsTab() {
  const { state } = useGame()
  const { models, setModel } = useModels()

  const nameFor = (slot: ModelSlot): string => {
    if (slot === 'STAR') return "⭐ L'Étoile"
    if (slot === 'DICE') return '🎲 (réservé)'
    const p = state.players.find((pl) => pl.id === slot)
    return p ? `${CHARACTERS[p.character].emoji} ${p.name}` : `Pion ${slot}`
  }

  return (
    <div>
      <p className="text-cream/60 text-xs font-bold">
        Charge un fichier .glb (upload) ou indique un chemin servi par Vite — dépose tes fichiers
        dans <code className="text-gold-300">public/models/</code> puis référence-les par{' '}
        <code className="text-gold-300">/models/mon-fichier.glb</code>. Le modèle remplace le pion
        (mis à l'échelle et posé au sol automatiquement).
      </p>
      <div className="mt-3 flex flex-col gap-2.5">
        {[...PLAYER_SLOTS, 'STAR' as const].map((slot) => (
          <ModelSlotRow key={slot} slot={slot} label={nameFor(slot)} current={models[slot] ?? null} onSet={(url) => setModel(slot, url)} />
        ))}
      </div>
    </div>
  )
}

function ModelSlotRow({
  slot,
  label,
  current,
  onSet,
}: {
  slot: ModelSlot
  label: string
  current: string | null
  onSet: (url: string | null) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [path, setPath] = useState('')

  return (
    <div className="bg-night-800/80 flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-2.5">
      <span className="w-36 truncate text-sm font-extrabold">{label}</span>
      <button
        onClick={() => fileRef.current?.click()}
        className="bg-night-900 hover:bg-night-700 rounded-lg px-3 py-1.5 text-xs font-extrabold"
      >
        📂 Charger un .glb
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSet(URL.createObjectURL(file))
          e.target.value = ''
        }}
      />
      <input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="/models/mon-pion.glb"
        className="bg-night-900 focus:ring-gold-400 min-w-0 flex-1 rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none focus:ring-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && path.trim()) {
            onSet(path.trim())
            setPath('')
          }
        }}
      />
      <button
        disabled={!path.trim()}
        onClick={() => {
          onSet(path.trim())
          setPath('')
        }}
        className="bg-gold-400/15 text-gold-300 hover:bg-gold-400/25 rounded-lg px-2.5 py-1.5 text-xs font-extrabold disabled:opacity-35"
      >
        OK
      </button>
      {current && (
        <span className="flex items-center gap-1.5">
          <span className="max-w-40 truncate font-mono text-[10px] text-emerald-300">
            ✓ {current.startsWith('blob:') ? 'fichier chargé' : current}
          </span>
          <button
            onClick={() => onSet(null)}
            title="Retirer le modèle"
            className="grid h-5 w-5 place-items-center rounded-full bg-red-500/80 text-[10px] font-extrabold text-white"
          >
            ✕
          </button>
        </span>
      )}
      <span className="sr-only">{slot}</span>
    </div>
  )
}
