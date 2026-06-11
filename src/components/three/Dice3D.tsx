// ============================================================
// Dice3D.tsx — Le dé 3D : un vrai cube qui tournoie dans les
// airs et retombe sur la face déjà tirée par le moteur.
// ============================================================

import { animated, easings, useSpring } from '@react-spring/three'
import { useEffect, useRef } from 'react'
import { DICE_BLOCKS } from '../../game/constants'
import type { DiceRollState } from '../../game/types'
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
  const block = DICE_BLOCKS[dice.blockId]
  const final = FACE_UP[dice.faceIndex]
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
    config: { duration: 1500, easing: easings.easeOutCubic },
    onRest: () => {
      timerRef.current = window.setTimeout(onLanded, 700)
    },
  })

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return (
    <group position={position}>
      <animated.mesh
        castShadow
        position-y={spring.drop.to((v) => 1.9 + v)}
        rotation-x={spring.rx}
        rotation-y={spring.ry}
        rotation-z={spring.rz}
        scale={spring.s}
      >
        <boxGeometry args={[1.15, 1.15, 1.15]} />
        {block.faces.map((face, i) => (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            map={diceFaceTexture(face.value, face.coins, block.color)}
            roughness={0.35}
          />
        ))}
      </animated.mesh>
      <pointLight position={[0, 3.4, 1]} intensity={5} distance={8} color="#fff6da" />
    </group>
  )
}
