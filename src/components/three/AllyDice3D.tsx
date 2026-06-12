// ============================================================
// AllyDice3D.tsx — Pendant ROLLING, les alliés « lancent » eux aussi :
// N mini-cubes tournoient et retombent À CÔTÉ du dé principal, chacun
// affichant sa contribution (1 ou 2) au lancer.
//
// IMPORTANT (présentation pure) : le moteur ne stocke QUE le TOTAL du
// bonus d'alliés (dans dice.modifierLabel, ex. « +3 alliés »). Il n'y a
// PAS de répartition par allié dans l'état. On ne RÉINVENTE donc rien :
// on lit le total exact committé par le reducer et on le répartit de
// façon DÉTERMINISTE (les `total - N` premiers montrent 2, les autres 1)
// → la somme des mini-dés vaut TOUJOURS exactement le bonus du moteur.
// Les textures de faces sont celles du dé NORMAL (textures.ts).
// ============================================================

import { animated, easings, useSpring } from '@react-spring/three'
import { useMemo } from 'react'
import { DICE_BLOCKS } from '../../game/constants'
import type { DiceRollState } from '../../game/types'
import { diceFaceTexture } from './textures'

/** Ordre BoxGeometry : +X,-X,+Y,-Y,+Z,-Z → orientation pour mettre la face i en haut. */
const FACE_UP: [number, number, number][] = [
  [0, 0, Math.PI / 2],
  [0, 0, -Math.PI / 2],
  [0, 0, 0],
  [Math.PI, 0, 0],
  [-Math.PI / 2, 0, 0],
  [Math.PI / 2, 0, 0],
]

/**
 * Extrait le TOTAL du bonus d'alliés depuis le libellé du moteur
 * (« … · +3 alliés · … »). Retourne null si absent (lancer forcé : les
 * alliés se taisent, donc aucun mini-dé — cohérent avec le gameplay).
 */
function readAllyBonus(label: string | null): number | null {
  if (!label) return null
  const m = label.match(/\+(\d+)\s+alli/i)
  return m ? Number(m[1]) : null
}

/**
 * Répartition DÉTERMINISTE du total entre `count` alliés, chacun valant
 * 1 ou 2, somme == total exact du moteur. Sécurisé/clampé.
 */
function splitAllyValues(total: number, count: number): number[] {
  if (count <= 0) return []
  const clamped = Math.max(count, Math.min(total, count * 2))
  const twos = clamped - count // nb d'alliés qui « font 2 »
  return Array.from({ length: count }, (_, i) => (i < twos ? 2 : 1))
}

interface Props {
  dice: DiceRollState
  /** Alliés du joueur courant (pour connaître COMBIEN de mini-dés afficher). */
  allyCount: number
}

export function AllyDice3D({ dice, allyCount }: Props) {
  const values = useMemo(() => {
    const total = readAllyBonus(dice.modifierLabel)
    if (total === null || allyCount <= 0) return []
    return splitAllyValues(total, allyCount)
  }, [dice.modifierLabel, allyCount])

  if (values.length === 0) return null

  return (
    <>
      {values.map((v, i) => (
        <MiniAllyDie key={i} value={v} index={i} />
      ))}
    </>
  )
}

const NORMAL = DICE_BLOCKS.NORMAL

function MiniAllyDie({ value, index }: { value: number; index: number }) {
  // Face du dé NORMAL correspondant à la valeur (1→index0 … 6→index5).
  const faceIndex = NORMAL.faces.findIndex((f) => f.value === value)
  const safeFace = faceIndex >= 0 ? faceIndex : 0
  const final = FACE_UP[safeFace]

  // Disposition en éventail à GAUCHE du dé principal (qui est à droite),
  // décalages dérivés de l'index → stable d'une frame à l'autre.
  const ox = -1.5 - index * 0.62
  const oz = 0.45 + (index % 2) * 0.4

  const spring = useSpring({
    from: { rx: 0, ry: 0, rz: 0, drop: 3.0, s: 0.0 },
    to: {
      rx: final[0] + Math.PI * 4,
      ry: final[1] + Math.PI * 2,
      rz: final[2],
      drop: 0,
      s: 1,
    },
    // léger délai par allié → ils retombent en cascade après le dé principal
    delay: 260 + index * 160,
    config: { duration: 1300, easing: easings.easeOutCubic },
  })

  return (
    <animated.mesh
      castShadow
      position-x={ox}
      position-z={oz}
      position-y={spring.drop.to((v) => 1.7 + v)}
      rotation-x={spring.rx}
      rotation-y={spring.ry}
      rotation-z={spring.rz}
      scale={spring.s.to((s) => s * 0.35)}
    >
      <boxGeometry args={[1, 1, 1]} />
      {NORMAL.faces.map((face, i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          map={diceFaceTexture(face.value, face.coins, '#7c5cff')}
          roughness={0.35}
        />
      ))}
    </animated.mesh>
  )
}
