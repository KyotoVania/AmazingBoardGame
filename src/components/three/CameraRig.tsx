// ============================================================
// CameraRig.tsx — Caméra isométrique : OrbitControls bridés +
// recentrage doux sur le joueur actif.
//   · Événement (arbre, trou, panneau, taupe, Boo, Étoile…) :
//     vrai TRAVELLING — la caméra descend se poser devant la case
//     concernée, puis revient à sa position d'origine.
//   · Récap de manche : survol orbital lent du plateau entier.
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

/** Position de la caméra par rapport au sujet pendant la cinématique. */
const CINE_OFFSET = new THREE.Vector3(2.6, 3.4, 4.6)

export function CameraRig({ state }: { state: GameState }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const dest = useMemo(() => new THREE.Vector3(), [])
  const cinePos = useMemo(() => new THREE.Vector3(), [])
  // Offset caméra (position - cible) mémorisé hors cinématique, pour y revenir
  const savedOffset = useRef(new THREE.Vector3(0, 23, 19))
  const mode = useRef<'free' | 'cine' | 'return'>('free')

  useFrame(({ camera }) => {
    const controls = controlsRef.current
    if (!controls) return
    const player = getCurrentPlayer(state)

    // ----- Cible du regard -----
    if (state.focusSpaceId) {
      const [x, , z] = spaceWorldPos(state.focusSpaceId)
      dest.set(x, 0.4, z)
    } else if (player && BOARD_PHASES.has(state.phase)) {
      const [x, , z] = spaceWorldPos(player.currentSpaceId)
      dest.set(x * 0.85, 0, z * 0.85)
    } else {
      dest.set(0, 0, 0)
    }

    // ----- Travelling cinématique -----
    if (state.focusSpaceId) {
      if (mode.current === 'free') {
        // on mémorise d'où l'on vient avant de plonger
        savedOffset.current.copy(camera.position).sub(controls.target)
        mode.current = 'cine'
      }
      cinePos.copy(dest).add(CINE_OFFSET)
      camera.position.lerp(cinePos, 0.07)
      controls.target.lerp(dest, 0.1)
      controls.update()
      return
    }
    if (mode.current === 'cine') mode.current = 'return'
    if (mode.current === 'return') {
      // remonte vers l'ancien point de vue, puis rend la main
      cinePos.copy(controls.target).add(savedOffset.current)
      camera.position.lerp(cinePos, 0.06)
      if (camera.position.distanceTo(cinePos) < 0.6) mode.current = 'free'
    }

    // ----- Récap de manche : orbite lente -----
    controls.autoRotate = state.phase === 'ROUND_INTRO'
    controls.autoRotateSpeed = 0.9

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
      minDistance={4}
      maxDistance={46}
      minPolarAngle={0.2}
      maxPolarAngle={1.22}
    />
  )
}
