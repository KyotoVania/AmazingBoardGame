// ============================================================
// DebugPanel.tsx — Le God Mode de DebugMode.md : panneau
// flottant semi-transparent avec contrôle total de l'état.
// ============================================================

import { useState } from 'react'
import { SPACE_IDS, getSpace } from '../../game/board'
import { ITEMS, ITEM_IDS } from '../../game/constants'
import type { ItemId, Player, PlayerId } from '../../game/types'
import { useGame } from '../../game/useGameState'

export function DebugPanel() {
  const { state, debug, restart } = useGame()
  const [forceValue, setForceValue] = useState('4')
  const [teleportTarget, setTeleportTarget] = useState<PlayerId>('P1')
  const [teleportSpace, setTeleportSpace] = useState<string>(SPACE_IDS[0])
  const [itemTarget, setItemTarget] = useState<PlayerId>('P1')
  const [itemId, setItemId] = useState<ItemId>(ITEM_IDS[0])
  const [statsTarget, setStatsTarget] = useState<PlayerId>('P1')

  const hasGame = state.players.length > 0
  const statsPlayer = state.players.find((p) => p.id === statsTarget)

  return (
    <aside className="bg-night-900/75 absolute top-14 right-3 bottom-3 z-40 w-80 overflow-y-auto rounded-2xl p-4 shadow-2xl ring-1 ring-red-400/40 backdrop-blur-md">
      <h3 className="font-display text-xl tracking-wide text-red-300">🛠️ God Mode</h3>
      <p className="text-cream/50 text-[11px] font-bold">
        Touche ~ (ou coin haut-gauche) pour revenir en LIVE. Phase : {state.phase}
      </p>

      {!hasGame ? (
        <p className="text-cream/70 mt-4 text-sm font-bold">
          Lance une partie pour débloquer les contrôles.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {/* ----- Force Dice Roll ----- */}
          <Section title="🎲 Forcer le dé">
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={30}
                value={forceValue}
                onChange={(e) => setForceValue(e.target.value)}
                className="bg-night-800 w-16 rounded-lg px-2 py-1.5 text-sm font-extrabold outline-none"
              />
              <MiniButton onClick={() => debug.forceRoll(Number(forceValue))}>Forcer</MiniButton>
              <MiniButton ghost onClick={() => debug.forceRoll(null)}>
                Annuler
              </MiniButton>
            </div>
            <p className="text-cream/55 mt-1 text-[11px] font-bold">
              {state.forcedRoll !== null
                ? `Prochain lancer forcé : ${state.forcedRoll}`
                : 'Aucun forçage actif'}
            </p>
          </Section>

          {/* ----- Teleport ----- */}
          <Section title="🚀 Téléporter">
            <div className="flex flex-wrap gap-2">
              <PlayerSelect players={state.players} value={teleportTarget} onChange={setTeleportTarget} />
              <select
                value={teleportSpace}
                onChange={(e) => setTeleportSpace(e.target.value)}
                className="bg-night-800 flex-1 rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
              >
                {SPACE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id} · {getSpace(id).type}
                  </option>
                ))}
              </select>
              <MiniButton onClick={() => debug.teleport(teleportTarget, teleportSpace)}>Go</MiniButton>
            </div>
          </Section>

          {/* ----- Inject Item ----- */}
          <Section title="🎁 Injecter un item">
            <div className="flex flex-wrap gap-2">
              <PlayerSelect players={state.players} value={itemTarget} onChange={setItemTarget} />
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value as ItemId)}
                className="bg-night-800 flex-1 rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
              >
                {ITEM_IDS.map((id) => (
                  <option key={id} value={id}>
                    {ITEMS[id].emoji} {ITEMS[id].name}
                  </option>
                ))}
              </select>
              <MiniButton onClick={() => debug.injectItem(itemTarget, itemId)}>Donner</MiniButton>
            </div>
          </Section>

          {/* ----- Trigger Minigame ----- */}
          <button
            onClick={debug.triggerMinigame}
            className="font-display rounded-xl bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 px-4 py-3 text-lg tracking-wide text-white shadow-[0_4px_0_rgba(0,0,0,0.35)]"
          >
            🎰 DÉCLENCHER LE MINIJEU
          </button>

          {/* ----- Cursed now ----- */}
          <button
            onClick={() => window.dispatchEvent(new Event('www-cursed-now'))}
            className="font-display mt-2 rounded-xl bg-gradient-to-b from-red-500 to-red-700 px-4 py-3 text-lg tracking-wide text-white shadow-[0_4px_0_rgba(0,0,0,0.35)]"
          >
            💀 ÉVÉNEMENT CURSED NOW
          </button>

          {/* ----- Edit Stats ----- */}
          <Section title="📊 Éditer les stats">
            <PlayerSelect players={state.players} value={statsTarget} onChange={setStatsTarget} />
            {statsPlayer && (
              <div className="mt-2 flex flex-col gap-1.5">
                <StatRow
                  label="🍺 Gorgées bues"
                  value={statsPlayer.sipsTaken}
                  onDelta={(d) => debug.editStats(statsTarget, { sipsTaken: statsPlayer.sipsTaken + d })}
                />
                <StatRow
                  label="🫗 Gorgées données"
                  value={statsPlayer.sipsGiven}
                  onDelta={(d) => debug.editStats(statsTarget, { sipsGiven: statsPlayer.sipsGiven + d })}
                />
                <StatRow
                  label="🪙 Pièces"
                  value={statsPlayer.coins}
                  step={5}
                  onDelta={(d) => debug.editStats(statsTarget, { coins: statsPlayer.coins + d })}
                />
                <StatRow
                  label="⭐ Étoiles"
                  value={statsPlayer.stars}
                  onDelta={(d) => debug.editStats(statsTarget, { stars: statsPlayer.stars + d })}
                />
              </div>
            )}
          </Section>

          <button
            onClick={restart}
            className="text-cream/60 rounded-xl bg-red-900/40 px-4 py-2 text-sm font-extrabold hover:bg-red-900/60"
          >
            ↺ RESET COMPLET (retour lobby)
          </button>
        </div>
      )}
    </aside>
  )
}

// ---------- Petits composants ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-night-800/60 rounded-xl p-3">
      <h4 className="text-cream/85 mb-2 text-xs font-extrabold tracking-wider uppercase">{title}</h4>
      {children}
    </section>
  )
}

function MiniButton({
  children,
  onClick,
  ghost,
}: {
  children: React.ReactNode
  onClick: () => void
  ghost?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-extrabold ${
        ghost ? 'bg-night-800 text-cream/65 hover:bg-night-700' : 'bg-gold-400 text-night-950 hover:bg-gold-300'
      }`}
    >
      {children}
    </button>
  )
}

function PlayerSelect({
  players,
  value,
  onChange,
}: {
  players: Player[]
  value: PlayerId
  onChange: (id: PlayerId) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PlayerId)}
      className="bg-night-800 rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
    >
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}

function StatRow({
  label,
  value,
  onDelta,
  step = 1,
}: {
  label: string
  value: number
  onDelta: (delta: number) => void
  step?: number
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold">
      <span className="text-cream/75 flex-1">{label}</span>
      <button onClick={() => onDelta(-step)} className="bg-night-800 hover:bg-night-700 h-7 w-7 rounded-md">
        −
      </button>
      <span className="w-9 text-center font-extrabold">{value}</span>
      <button onClick={() => onDelta(step)} className="bg-night-800 hover:bg-night-700 h-7 w-7 rounded-md">
        +
      </button>
    </div>
  )
}
