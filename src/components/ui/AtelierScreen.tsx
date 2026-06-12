// ============================================================
// AtelierScreen.tsx — 🎨 L'Atelier : LE hub de customisation,
// séparé du lobby. Onglets : éditeur de map, modèles 3D,
// portraits de dialogues, sons, règles & événements cursed.
// ============================================================

import { useState } from 'react'
import { MapEditor } from '../editor/MapEditor'
import { SoundControls } from '../../audio/SoundControls'
import { EVENT_CHARACTERS, EVENT_CHARACTER_IDS } from '../../game/eventImages'
import type { ModelSlot } from '../three/Models'
import { ConfigPanel } from './ConfigPanel'
import { ModelPicker } from './ModelPicker'
import { PortraitPicker } from './PortraitPicker'

type Tab = 'map' | 'models' | 'portraits' | 'sounds' | 'rules'

const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: '🗺️ Éditeur de map' },
  { id: 'models', label: '🧸 Modèles 3D' },
  { id: 'portraits', label: '🎭 Portraits' },
  { id: 'sounds', label: '🔊 Sons' },
  { id: 'rules', label: '⚙️ Règles & Cursed' },
]

const DECOR_SLOTS: { slot: ModelSlot; label: string }[] = [
  { slot: 'STAR', label: "⭐ L'Étoile" },
  { slot: 'TREE_GOOD', label: '🌳 Arbre généreux' },
  { slot: 'TREE_BAD', label: '🌳 Arbre maudit' },
  { slot: 'MOLE', label: '🦫 Topi Taupe' },
  { slot: 'BOO', label: '👻 Boo' },
]

const PLAYER_SLOTS: { slot: ModelSlot; label: string }[] = [
  { slot: 'P1', label: 'Pion Joueur 1' },
  { slot: 'P2', label: 'Pion Joueur 2' },
  { slot: 'P3', label: 'Pion Joueur 3' },
  { slot: 'P4', label: 'Pion Joueur 4' },
]

export function AtelierScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('map')
  const [configOpen, setConfigOpen] = useState(false)

  return (
    <div className="bg-night-950 fixed inset-0 z-[60] flex flex-col">
      {/* En-tête */}
      <header className="bg-night-900/80 flex items-center gap-3 px-5 py-3 backdrop-blur-sm">
        <h2 className="font-display text-gold-300 text-3xl tracking-wide">🎨 L'Atelier</h2>
        <nav className="ml-4 flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-extrabold transition-colors ${
                tab === t.id ? 'bg-gold-400 text-night-950' : 'bg-night-800 text-cream/75 hover:bg-night-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          onClick={onClose}
          className="bg-night-800 hover:bg-night-700 ml-auto rounded-full px-4 py-1.5 text-sm font-extrabold"
        >
          ✕ Retour au lobby
        </button>
      </header>

      {/* Contenu */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'map' && <MapEditor />}

        {tab === 'models' && (
          <div className="h-full overflow-y-auto p-6">
            <Intro>
              Remplace les pions et les habitants du plateau par tes propres .glb : dépose tes
              fichiers dans <code className="text-gold-300">public/models/</code> et liste-les dans{' '}
              <code className="text-gold-300">public/models/manifest.json</code> — la banque KayKit
              convertie est déjà dedans. Upload direct possible (session en cours uniquement).
            </Intro>
            <div className="mt-5 grid max-w-5xl grid-cols-2 gap-4">
              <section>
                <h3 className="text-gold-300 mb-2 text-sm font-extrabold uppercase">Les pions</h3>
                <div className="flex flex-col gap-2">
                  {PLAYER_SLOTS.map(({ slot, label }) => (
                    <LabeledRow key={slot} label={label}>
                      <ModelPicker slot={slot} compact />
                    </LabeledRow>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-gold-300 mb-2 text-sm font-extrabold uppercase">Le décor</h3>
                <div className="flex flex-col gap-2">
                  {DECOR_SLOTS.map(({ slot, label }) => (
                    <LabeledRow key={slot} label={label}>
                      <ModelPicker slot={slot} compact />
                    </LabeledRow>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === 'portraits' && (
          <div className="h-full overflow-y-auto p-6">
            <Intro>
              Change la tête des personnages qui parlent dans les boîtes de dialogue (Boo, Kamek,
              Toadette, Flutter…). Banque :{' '}
              <code className="text-gold-300">public/images/characters/manifest.json</code> — ou
              upload direct (persisté sur ce navigateur).
            </Intro>
            <div className="mt-5 grid max-w-5xl grid-cols-2 gap-3 xl:grid-cols-3">
              {EVENT_CHARACTER_IDS.map((id) => (
                <LabeledRow key={id} label={`${EVENT_CHARACTERS[id].emoji} ${EVENT_CHARACTERS[id].name}`}>
                  <PortraitPicker characterId={id} />
                </LabeledRow>
              ))}
            </div>
          </div>
        )}

        {tab === 'sounds' && (
          <div className="h-full overflow-y-auto p-6">
            <Intro>
              Le jeu joue TES sons : dépose des mp3/ogg dans{' '}
              <code className="text-gold-300">public/sounds/</code> et mappe-les dans{' '}
              <code className="text-gold-300">public/sounds/manifest.json</code> (un exemple
              complet est fourni à côté : <code>manifest.example.json</code>). Clés disponibles :
              dé, pas, vols de pièces/étoile, roulette, podium, récompenses, tour, mur, fin de
              partie, cursed.
            </Intro>
            <div className="mt-5 max-w-md">
              <SoundControls />
            </div>
          </div>
        )}

        {tab === 'rules' && (
          <div className="h-full overflow-y-auto p-6">
            <Intro>
              Les règles chiffrées (gorgées, pièces, seuils du trou et du mur, minijeux, intervalle
              des événements cursed…) s'éditent dans le panneau de configuration. Les images/GIFs
              cursed vont dans <code className="text-gold-300">public/images/cursed/</code> +{' '}
              <code className="text-gold-300">manifest.json</code>, et les textes trash dans{' '}
              <code className="text-gold-300">src/game/eventNarratives.ts</code>.
            </Intro>
            <button
              onClick={() => setConfigOpen(true)}
              className="font-display from-gold-400 to-gold-500 text-night-950 mt-5 rounded-xl bg-gradient-to-b px-6 py-3 text-xl tracking-wide shadow-[0_4px_0_rgba(0,0,0,0.35)]"
            >
              ⚙️ Ouvrir la configuration des règles
            </button>
          </div>
        )}
      </div>

      {configOpen && <ConfigPanel onClose={() => setConfigOpen(false)} />}
    </div>
  )
}

function Intro({ children }: { children: React.ReactNode }) {
  return <p className="text-cream/70 max-w-3xl text-sm font-bold">{children}</p>
}

function LabeledRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-night-900/70 rounded-xl p-3">
      <p className="text-cream/80 mb-1.5 text-sm font-extrabold">{label}</p>
      {children}
    </div>
  )
}
