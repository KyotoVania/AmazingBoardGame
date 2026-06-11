// ============================================================
// App.tsx — Assemblage : scène 3D plein écran + overlays 2D par
// phase + toggle LIVE/DEBUG (touche ~ ou bouton invisible).
// ============================================================

import { useEffect } from 'react'
import { GameCanvas } from './components/three/GameCanvas'
import { ActionBar } from './components/ui/ActionBar'
import { DebugPanel } from './components/ui/DebugPanel'
import { EventPopup } from './components/ui/EventPopup'
import { GameLog } from './components/ui/GameLog'
import { GameOverScreen } from './components/ui/GameOverScreen'
import { Hud } from './components/ui/Hud'
import { LobbyScreen } from './components/ui/LobbyScreen'
import { MinigameOverlay } from './components/ui/MinigameOverlay'
import { PodiumScreen } from './components/ui/PodiumScreen'
import { RewardsScreen } from './components/ui/RewardsScreen'
import { RoundIntro } from './components/ui/RoundIntro'
import { FxOverlay } from './components/ui/FxOverlay'
import { GameProvider, useGame } from './game/useGameState'

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  )
}

function Shell() {
  const api = useGame()
  const { state, debug } = api

  // Toggle caché LIVE <-> DEBUG : touche ~ (DebugMode.md)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '~' || e.code === 'Backquote') {
        e.preventDefault()
        debug.toggleMode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [debug])

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-night-950 font-sans text-cream">
      {state.phase === 'LOBBY' ? (
        <LobbyScreen />
      ) : (
        <>
          <div className="absolute inset-0">
            <GameCanvas api={api} />
          </div>
          <Hud />
          <GameLog />
          <ActionBar />
          <MinigameOverlay />
          {state.phase === 'PODIUM' && <PodiumScreen />}
          {state.phase === 'REWARDS' && <RewardsScreen />}
          {state.phase === 'ROUND_INTRO' && <RoundIntro />}
          {state.phase === 'GAME_OVER' && <GameOverScreen />}
          <EventPopup />
          <FxOverlay />
        </>
      )}

      {/* Toggle caché LIVE <-> DEBUG : minuscule bouton invisible en haut à gauche */}
      <button
        aria-label="toggle-debug"
        title=""
        onClick={() => debug.toggleMode()}
        className="absolute top-0 left-0 z-50 h-9 w-9 opacity-0"
      />

      {state.mode === 'DEBUG' && (
        <>
          <div className="bg-red-600/90 font-display absolute top-3 right-3 z-50 rounded-md px-2.5 py-1 text-xs tracking-widest shadow-lg">
            DEBUG · GOD MODE
          </div>
          <DebugPanel />
        </>
      )}
    </div>
  )
}
