// ============================================================
// GameCanvas.tsx — La scène 3D complète. Le contexte React ne
// traverse pas le renderer R3F : l'API du jeu est passée en props.
// ============================================================

import { Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { spaceWorldPos } from '../../game/board'
import { getCurrentPlayer } from '../../game/reducer'
import type { GameApi } from '../../game/useGameState'
import { AllyDice3D } from './AllyDice3D'
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

  const rolling = state.phase === 'ROLLING' && !!state.dice

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 23, 19], fov: 42 }}
      gl={{ powerPreference: 'high-performance' }}
    >
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
      {/* Lumière du dé : TOUJOURS montée (compte de lights constant → pas de
          recompilation de shaders à chaque lancer). Elle se déplace sur le
          pion courant et ne s'allume (intensity > 0) que pendant ROLLING.
          Hors ROLLING : intensity 0 → strictement invisible, comme avant. */}
      <pointLight
        position={[dicePos[0], 3.4, dicePos[2] + 1]}
        intensity={rolling ? 5 : 0}
        distance={8}
        color="#fff6da"
      />
      <Board3D state={state} chooseFork={api.chooseFork} models={models} />
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
        <group position={dicePos}>
          <Dice3D dice={state.dice} position={[0, 0, 0]} onLanded={api.diceLanded} />
          {/* Mini-dés des alliés : tournoient à côté, valeur (1/2) lue du moteur. */}
          <AllyDice3D dice={state.dice} allyCount={(player?.allies ?? []).length} />
        </group>
      )}
      <CameraRig state={state} />
      {/* Post-process léger « console » : lueur sur les éléments brillants
          (Étoile, lucioles, dés) + vignettage discret. multisampling 0 :
          le SMAA du bloom mipmap suffit et ménage les petits GPU/TV. */}
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.25} />
        <Vignette eskil={false} offset={0.18} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  )
}
