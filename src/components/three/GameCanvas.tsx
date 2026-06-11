// ============================================================
// GameCanvas.tsx — La scène 3D complète. Le contexte React ne
// traverse pas le renderer R3F : l'API du jeu est passée en props.
// ============================================================

import { Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { spaceWorldPos } from '../../game/board'
import { getCurrentPlayer } from '../../game/reducer'
import type { GameApi } from '../../game/useGameState'
import { Board3D } from './Board3D'
import { CameraRig } from './CameraRig'
import { Dice3D } from './Dice3D'
import { useModels } from './Models'
import { PlayerToken3D } from './PlayerToken3D'

export function GameCanvas({ api }: { api: GameApi }) {
  const { state } = api
  // lu HORS du Canvas (le contexte React ne traverse pas le renderer R3F)
  const { models } = useModels()
  const player = getCurrentPlayer(state)

  let dicePos: [number, number, number] = [0, 0, 0]
  if (player) {
    const [x, , z] = spaceWorldPos(player.currentSpaceId)
    dicePos = [x, 0, z]
  }

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 23, 19], fov: 42 }}>
      <color attach="background" args={['#0a1410']} />
      <fog attach="fog" args={['#0a1410', 46, 105]} />
      {/* nuit étoilée au-dessus de la forêt */}
      <Stars radius={130} depth={50} count={1600} factor={3.2} saturation={0.4} fade speed={0.5} />
      <ambientLight intensity={0.42} color="#bcd4e8" />
      <hemisphereLight args={['#cfe5ff', '#28401f', 0.5]} />
      {/* clé chaude (lanterne de fête) */}
      <directionalLight
        castShadow
        position={[12, 20, 8]}
        intensity={1.5}
        color="#ffeacc"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
      />
      {/* contre-jour froid pour détacher les silhouettes */}
      <directionalLight position={[-14, 9, -16]} intensity={0.45} color="#7fa3ff" />
      <Board3D state={state} chooseFork={api.chooseFork} starModelUrl={models.STAR ?? null} />
      {state.players.map((p, i) => (
        <PlayerToken3D
          key={p.id}
          player={p}
          index={i}
          modelUrl={models[p.id] ?? null}
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
