// ============================================================
// CameraRig.tsx — Caméra isométrique : OrbitControls bridés +
// recentrage doux sur le joueur actif pendant la phase plateau.
// ============================================================

import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { spaceWorldPos } from '../../game/board'
import { getCurrentPlayer } from '../../game/reducer'
import type { GamePhase, GameState } from '../../game/types'

const BOARD_PHASES = new Set<GamePhase>([
  'TURN_START',
  'ROLLING',
  'MOVING',
  'FORK_CHOICE',
  'PASS_EVENT',
  'SPACE_ACTION',
  'TURN_END',
])

export function CameraRig({ state }: { state: GameState }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const dest = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return
    const player = getCurrentPlayer(state)
    if (player && BOARD_PHASES.has(state.phase)) {
      const [x, , z] = spaceWorldPos(player.currentSpaceId)
      dest.set(x * 0.85, 0, z * 0.85)
    } else {
      dest.set(0, 0, 0)
    }
    controls.target.lerp(dest, 0.045)
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={7}
      maxDistance={32}
      minPolarAngle={0.2}
      maxPolarAngle={1.22}
    />
  )
}
