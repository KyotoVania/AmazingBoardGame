// ============================================================
// GameCanvas.tsx — La scène 3D complète. Le contexte React ne
// traverse pas le renderer R3F : l'API du jeu est passée en props.
// ============================================================

import { Canvas } from '@react-three/fiber'
import { spaceWorldPos } from '../../game/board'
import { getCurrentPlayer } from '../../game/reducer'
import type { GameApi } from '../../game/useGameState'
import { Board3D } from './Board3D'
import { CameraRig } from './CameraRig'
import { Dice3D } from './Dice3D'
import { PlayerToken3D } from './PlayerToken3D'

export function GameCanvas({ api }: { api: GameApi }) {
  const { state } = api
  const player = getCurrentPlayer(state)

  let dicePos: [number, number, number] = [0, 0, 0]
  if (player) {
    const [x, , z] = spaceWorldPos(player.currentSpaceId)
    dicePos = [x, 0, z]
  }

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 17, 14], fov: 42 }}>
      <color attach="background" args={['#0d1a10']} />
      <fog attach="fog" args={['#0d1a10', 30, 70]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#cfe5ff', '#28401f', 0.55]} />
      <directionalLight
        castShadow
        position={[12, 20, 8]}
        intensity={1.4}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <Board3D state={state} chooseFork={api.chooseFork} />
      {state.players.map((p, i) => (
        <PlayerToken3D
          key={p.id}
          player={p}
          index={i}
          isCurrent={i === state.currentPlayerIndex}
          hopTo={
            state.phase === 'MOVING' && i === state.currentPlayerIndex
              ? (state.movement?.hopTo ?? null)
              : null
          }
          onHopDone={api.stepDone}
        />
      ))}
      {state.phase === 'ROLLING' && state.dice && (
        <Dice3D dice={state.dice} position={dicePos} onLanded={api.diceLanded} />
      )}
      <CameraRig state={state} />
    </Canvas>
  )
}
