// ============================================================
// PlayerToken3D.tsx — Pion 3D d'un joueur. Saute en arc
// parabolique de case en case (react-spring) et signale chaque
// pas au moteur via onHopDone → STEP_DONE.
// ============================================================

import { animated, easings, useSpring } from '@react-spring/three'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { spaceWorldPos } from '../../game/board'
import { CHARACTERS } from '../../game/constants'
import type { Player } from '../../game/types'
import { spriteTexture } from './textures'

/** Décalage par joueur pour éviter l'empilement sur une même case. */
const OFFSETS: [number, number][] = [
  [-0.26, -0.26],
  [0.26, -0.26],
  [-0.26, 0.26],
  [0.26, 0.26],
]
const JUMP_HEIGHT = 0.95
const HOP_MS = 430

interface Props {
  player: Player
  index: number
  isCurrent: boolean
  /** Case cible du saut en cours (uniquement pour le pion qui bouge). */
  hopTo: string | null
  onHopDone: () => void
}

export function PlayerToken3D({ player, index, isCurrent, hopTo, onHopDone }: Props) {
  const offset = OFFSETS[index % OFFSETS.length]
  const targetId = isCurrent && hopTo ? hopTo : player.currentSpaceId

  const worldOf = (id: string): [number, number] => {
    const [x, , z] = spaceWorldPos(id)
    return [x + offset[0], z + offset[1]]
  }

  const posRef = useRef<[number, number]>(worldOf(player.currentSpaceId))
  const fromRef = useRef<[number, number]>(posRef.current)
  const toRef = useRef<[number, number]>(posRef.current)
  const hopRef = useRef(false)

  const [spring, springApi] = useSpring(() => ({ t: 1 }))

  useEffect(() => {
    const dest = worldOf(targetId)
    if (dest[0] === posRef.current[0] && dest[1] === posRef.current[1]) return
    fromRef.current = [...posRef.current]
    toRef.current = dest
    hopRef.current = isCurrent && hopTo === targetId
    springApi.start({
      from: { t: 0 },
      to: { t: 1 },
      config: { duration: HOP_MS, easing: easings.easeInOutSine },
      onRest: () => {
        posRef.current = toRef.current
        if (hopRef.current) {
          hopRef.current = false
          onHopDone()
        }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId])

  const x = spring.t.to((t) => fromRef.current[0] + (toRef.current[0] - fromRef.current[0]) * t)
  const z = spring.t.to((t) => fromRef.current[1] + (toRef.current[1] - fromRef.current[1]) * t)
  const y = spring.t.to((t) => {
    const moving =
      fromRef.current[0] !== toRef.current[0] || fromRef.current[1] !== toRef.current[1]
    const arc = moving
      ? Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0, 1)) * JUMP_HEIGHT
      : 0
    return 0.14 + arc
  })

  const charTex = spriteTexture(CHARACTERS[player.character].emoji)

  return (
    <animated.group position-x={x} position-y={y} position-z={z}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <coneGeometry args={[0.27, 0.62, 24]} />
        <meshStandardMaterial color={player.color} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.17, 24, 16]} />
        <meshStandardMaterial color={player.color} roughness={0.3} />
      </mesh>
      <sprite position={[0, 1.22, 0]} scale={[0.5, 0.5, 0.5]}>
        <spriteMaterial map={charTex} transparent depthWrite={false} />
      </sprite>
      {isCurrent && <CurrentRing color={player.color} />}
    </animated.group>
  )
}

function CurrentRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.elapsedTime * 2.4
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position-y={0.02}>
      <ringGeometry args={[0.48, 0.58, 28, 1, 0, Math.PI * 1.5]} />
      <meshBasicMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} />
    </mesh>
  )
}
