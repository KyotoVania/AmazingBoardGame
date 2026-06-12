// ============================================================
// CameraRig.tsx — Caméra isométrique : OrbitControls bridés +
// recentrage doux ciblant le PION du joueur actif.
//   · TURN_START : cinématique « wow » — la caméra se rapproche
//     nettement du pion (distance ~6.5, angle plongeant).
//   · ROLLING/MOVING/PASS_EVENT/SPACE_ACTION… : suivi du pion à
//     distance moyenne (~12).
//   · Événement (focusSpaceId) : travelling sur la case concernée.
//   · Hors plateau (minijeux, podium…) : recentrage sur le plateau.
//   · Mode 'overview' (store cameraMode) : vue d'ensemble (~30).
//   · L'utilisateur garde la main : tout recentrage est suspendu
//     pendant qu'il manipule, et ~2 s après son dernier geste.
// ============================================================

import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { spaceWorldPos } from '../../game/board'
import { getCurrentPlayer } from '../../game/reducer'
import type { GamePhase, GameState } from '../../game/types'
import { getCameraMode } from './cameraMode'
import { pawnWorldPos } from './PlayerToken3D'

const BOARD_PHASES = new Set<GamePhase>([
  'TURN_START',
  'ROLLING',
  'MOVING',
  'FORK_CHOICE',
  'PASS_EVENT',
  'SPACE_ACTION',
  'TURN_END',
])

/** Position caméra ↔ sujet pendant le travelling d'événement. */
const CINE_OFFSET = new THREE.Vector3(2.6, 3.4, 4.6)
/** Gros plan « wow » de début de tour : proche + plongée. */
const TURN_START_OFFSET = new THREE.Vector3(3.4, 4.6, 5.0) // ‖·‖ ≈ 7
/** Suivi du pion pendant le tour : distance moyenne. */
const FOLLOW_OFFSET = new THREE.Vector3(6.5, 8.5, 7.2) // ‖·‖ ≈ 13
/** Vue d'ensemble du plateau. */
const OVERVIEW_OFFSET = new THREE.Vector3(0, 23, 19) // ‖·‖ ≈ 30

/** Délai (s) d'inactivité avant que le recentrage auto reprenne la main. */
const RESUME_DELAY = 2

export function CameraRig({ state }: { state: GameState }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const dest = useMemo(() => new THREE.Vector3(), [])
  const camGoal = useMemo(() => new THREE.Vector3(), [])
  // Offset caméra (position - cible) mémorisé hors travelling d'événement.
  const savedOffset = useRef(new THREE.Vector3(0, 23, 19))
  const mode = useRef<'free' | 'cine' | 'return'>('free')
  // Interaction utilisateur : timestamp du dernier geste OrbitControls.
  const lastUserMove = useRef(-Infinity)
  const userActive = useRef(false)

  // ----- Écoute des gestes de l'utilisateur (molette / drag) -----
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const onStart = () => {
      userActive.current = true
    }
    const onEnd = () => {
      userActive.current = false
      lastUserMove.current = performance.now() / 1000
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
    }
  }, [])

  // Le mode caméra est lu chaque frame via getCameraMode() (store hors-React),
  // donc aucune souscription n'est nécessaire ici.

  useFrame(({ camera }) => {
    const controls = controlsRef.current
    if (!controls) return
    const player = getCurrentPlayer(state)
    const overview = getCameraMode() === 'overview'

    // ----- Cible du regard (pion du joueur actif, ou case d'événement) -----
    if (overview) {
      dest.set(0, 0, 0)
    } else if (state.focusSpaceId) {
      const [x, , z] = spaceWorldPos(state.focusSpaceId)
      dest.set(x, 0.4, z)
    } else if (player && BOARD_PHASES.has(state.phase)) {
      const [x, y, z] = pawnWorldPos(player.currentSpaceId, state.currentPlayerIndex)
      dest.set(x, y, z)
    } else {
      dest.set(0, 0, 0)
    }

    // ----- L'utilisateur a-t-il la main ? -----
    const now = performance.now() / 1000
    const userHasControl =
      userActive.current || now - lastUserMove.current < RESUME_DELAY

    // ----- Travelling cinématique d'événement (prioritaire) -----
    if (state.focusSpaceId && !overview) {
      if (mode.current === 'free') {
        savedOffset.current.copy(camera.position).sub(controls.target)
        mode.current = 'cine'
      }
      controls.autoRotate = false
      controls.target.lerp(dest, 0.1)
      if (!userHasControl) {
        camGoal.copy(dest).add(CINE_OFFSET)
        camera.position.lerp(camGoal, 0.07)
      }
      controls.update()
      return
    }
    if (mode.current === 'cine') mode.current = 'return'
    if (mode.current === 'return') {
      if (!userHasControl) {
        camGoal.copy(controls.target).add(savedOffset.current)
        camera.position.lerp(camGoal, 0.06)
      }
      if (camera.position.distanceTo(camGoal) < 0.6 || userHasControl) mode.current = 'free'
    }

    // ----- Récap de manche : orbite lente (sauf en overview/interaction) -----
    controls.autoRotate = state.phase === 'ROUND_INTRO' && !overview && !userHasControl
    controls.autoRotateSpeed = 0.9

    // Tant que l'utilisateur manipule, on ne se bat pas contre lui.
    if (userHasControl) {
      controls.update()
      return
    }

    // ----- Choix de l'offset caméra selon le contexte -----
    let offset = OVERVIEW_OFFSET
    let camLerp = 0.045
    if (!overview) {
      if (player && state.phase === 'TURN_START') {
        offset = TURN_START_OFFSET // gros plan « wow »
        camLerp = 0.06
      } else if (player && BOARD_PHASES.has(state.phase)) {
        offset = FOLLOW_OFFSET // suivi moyen
        camLerp = 0.05
      }
    }

    // En orbite (ROUND_INTRO) on laisse OrbitControls piloter la position ;
    // sinon on tire doucement la caméra vers son offset cible.
    const targetLerp = overview ? 0.045 : 0.08
    controls.target.lerp(dest, targetLerp)
    if (!controls.autoRotate) {
      camGoal.copy(dest).add(offset)
      camera.position.lerp(camGoal, camLerp)
    }
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
