// ============================================================
// Dice3D.tsx — Les dés 3D : le dé principal tournoie et retombe
// sur la face déjà tirée par le moteur. Si un dé BONUS du podium
// est en jeu, un second cube (doré/argenté/maudit) est lancé à
// côté, automatiquement.
// ============================================================

import { animated, easings, useSpring } from '@react-spring/three'
import { useEffect, useRef } from 'react'
import { DICE_BLOCKS } from '../../game/constants'
import type { DiceBlockId, DiceRollState } from '../../game/types'
import { diceFaceTexture } from './textures'

/**
 * Rotation finale (euler XYZ) pour amener la face i vers le haut.
 * Ordre des matériaux d'une BoxGeometry : +X, -X, +Y, -Y, +Z, -Z.
 */
const FACE_UP: [number, number, number][] = [
  [0, 0, Math.PI / 2],
  [0, 0, -Math.PI / 2],
  [0, 0, 0],
  [Math.PI, 0, 0],
  [-Math.PI / 2, 0, 0],
  [Math.PI / 2, 0, 0],
]

interface Props {
  dice: DiceRollState
  position: [number, number, number]
  onLanded: () => void
}

export function Dice3D({ dice, position, onLanded }: Props) {
  return (
    <group position={position}>
      <SpinningDie
        blockId={dice.blockId}
        faceIndex={dice.faceIndex}
        offset={dice.bonus ? [-0.85, 0, 0] : [0, 0, 0]}
        size={1.15}
        onLanded={onLanded}
      />
      {dice.bonus && (
        <SpinningDie
          blockId={dice.bonus.blockId}
          faceIndex={dice.bonus.faceIndex}
          offset={[0.95, 0, 0.35]}
          size={0.92}
          delayMs={220}
        />
      )}
      <pointLight position={[0, 3.4, 1]} intensity={5} distance={8} color="#fff6da" />
    </group>
  )
}

interface DieProps {
  blockId: DiceBlockId
  faceIndex: number
  offset: [number, number, number]
  size: number
  /** Léger décalage de départ pour le dé bonus (effet "double lancer"). */
  delayMs?: number
  /** Seul le dé principal pilote la suite du tour. */
  onLanded?: () => void
}

function SpinningDie({ blockId, faceIndex, offset, size, delayMs = 0, onLanded }: DieProps) {
  const block = DICE_BLOCKS[blockId]
  const final = FACE_UP[faceIndex]
  const timerRef = useRef(0)

  const spring = useSpring({
    from: { rx: 0, ry: 0, rz: 0, drop: 3.4, s: 0.65 },
    to: {
      // des tours complets en plus de l'orientation finale : même face à l'arrivée
      rx: final[0] + Math.PI * 4,
      ry: final[1] + Math.PI * 2,
      rz: final[2],
      drop: 0,
      s: 1,
    },
    delay: delayMs,
    config: { duration: 1500, easing: easings.easeOutCubic },
    onRest: () => {
      if (onLanded) timerRef.current = window.setTimeout(onLanded, 900)
    },
  })

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return (
    <animated.mesh
      castShadow
      position-x={offset[0]}
      position-z={offset[2]}
      position-y={spring.drop.to((v) => 1.9 + v)}
      rotation-x={spring.rx}
      rotation-y={spring.ry}
      rotation-z={spring.rz}
      scale={spring.s.to((v) => v * size)}
    >
      <boxGeometry args={[1, 1, 1]} />
      {block.faces.map((face, i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          map={diceFaceTexture(face.value, face.coins, block.color)}
          roughness={0.35}
        />
      ))}
    </animated.mesh>
  )
}
