// ============================================================
// AllyEntourage.tsx — L'« effet wow » des alliés (présentation pure,
// zéro gameplay). Trois ingrédients :
//   1. ARRIVÉE SPECTACULAIRE : quand le nb d'alliés augmente, le petit
//      dernier débarque en COURANT depuis le bord du plateau jusqu'à sa
//      place dans la file, avec bonds rapides + nuage de poussière.
//   2. FILE INDIENNE VIVANTE : chaque mini-pion suit celui de devant
//      (le 1er suit le joueur) avec un léger retard → effet « canards »,
//      sautillement continu pendant les déplacements.
//   3. (les mini-dés sont gérés par AllyDice3D pendant ROLLING.)
//
// La position MONDE du joueur (springs x/z animés) est passée par le
// PlayerToken, donc la file traîne en repère monde — c'est ce qui crée
// la cascade. Les mini-pions sont rendus comme frères du pion (hors de
// son group animé) pour ne PAS se figer rigidement sur lui.
// ============================================================

import { Sparkles } from '@react-three/drei'
import { easings, useSpring } from '@react-spring/three'
import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CHARACTERS } from '../../game/constants'
import type { CharacterId } from '../../game/types'
import { spriteTexture } from './textures'

/** Distance derrière le précédent dans la file (en unités plateau). */
const TRAIL_GAP = 0.62
/** Réactivité du suivi (plus haut = colle plus vite au leader). */
const FOLLOW_STIFFNESS = 6.5
/** Décalages latéraux légers pour que la file ne soit pas une ligne morte. */
const LANE_OFFSET = [0.12, -0.14, 0.1]

/** Vecteur de travail réutilisé (évite d'allouer un Vector3 par frame). */
const _dir = new THREE.Vector3()

/** Valeur réactive lisible (SpringValue ou Interpolation react-spring). */
type Readable = { get(): number }

interface Props {
  allies: CharacterId[]
  color: string
  /** Position MONDE animée du joueur (mêmes springs que le pion). */
  leaderX: Readable
  leaderZ: Readable
}

export function AllyEntourage({ allies, color, leaderX, leaderZ }: Props) {
  // Position monde courante de chaque maillon de la file (mutée par useFrame).
  const chain = useRef<{ x: number; z: number }[]>([])
  // Combien d'alliés courent encore vers leur place (les derniers arrivés).
  const prevCount = useRef(allies.length)
  const [arrivals, setArrivals] = useState<number[]>([])

  // Détecte l'AUGMENTATION du nombre d'alliés → déclenche l'arrivée courue.
  useEffect(() => {
    if (allies.length > prevCount.current) {
      const fresh: number[] = []
      for (let i = prevCount.current; i < allies.length; i++) fresh.push(i)
      setArrivals((a) => [...a, ...fresh])
    }
    prevCount.current = allies.length
  }, [allies.length])

  return (
    <>
      {allies.map((ally, i) => (
        <AllyLink
          key={`${ally}-${i}`}
          ally={ally}
          index={i}
          color={color}
          leaderX={leaderX}
          leaderZ={leaderZ}
          chain={chain}
          arriving={arrivals.includes(i)}
          onArrived={() => setArrivals((a) => a.filter((n) => n !== i))}
        />
      ))}
    </>
  )
}

interface LinkProps {
  ally: CharacterId
  index: number
  color: string
  leaderX: Readable
  leaderZ: Readable
  chain: MutableRefObject<{ x: number; z: number }[]>
  arriving: boolean
  onArrived: () => void
}

function AllyLink({
  ally,
  index,
  color,
  leaderX,
  leaderZ,
  chain,
  arriving,
  onArrived,
}: LinkProps) {
  const groupRef = useRef<THREE.Group>(null)
  // Halo d'arrivée : TOUJOURS monté (nombre de lights constant tant que
  // l'allié existe → pas de recompilation de shaders à chaque arrivée).
  // On module son intensité dans useFrame : vive pendant la course, 0 sinon.
  const haloRef = useRef<THREE.PointLight>(null)
  const tex = useMemo(() => spriteTexture(CHARACTERS[ally].emoji), [ally])
  const lane = LANE_OFFSET[index % LANE_OFFSET.length]
  // Phase de bond propre à chaque allié (déterministe via l'index → pas de
  // Math.random() par frame qui ferait sauter l'image).
  const bobPhase = index * 1.7
  // Mémorise si ce maillon a déjà rejoint la file (sinon il « court » encore).
  const settled = useRef(!arriving)
  const spawnT = useRef(arriving ? 0 : 1) // 0 = au bord, 1 = en place

  // Anime la progression de la COURSE d'arrivée (0 → 1).
  const [run, runApi] = useSpring(() => ({ t: arriving ? 0 : 1 }))
  useEffect(() => {
    if (!arriving) return
    settled.current = false
    spawnT.current = 0
    runApi.start({
      from: { t: 0 },
      to: { t: 1 },
      config: { duration: 1400, easing: easings.easeOutCubic },
      onChange: (r) => {
        spawnT.current = (r.value as { t: number }).t
      },
      onRest: () => {
        settled.current = true
        spawnT.current = 1
        onArrived()
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arriving])

  // Petit nuage de poussière + étincelles à l'atterrissage de la course.
  const [dust, setDust] = useState(false)
  const dustTimer = useRef(0)

  useFrame((stateThree, delta) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05)

    // Position du maillon de DEVANT : le joueur pour i=0, sinon l'allié i-1.
    const leader =
      index === 0
        ? { x: leaderX.get(), z: leaderZ.get() }
        : (chain.current[index - 1] ?? { x: leaderX.get(), z: leaderZ.get() })

    // Cible : un cran derrière le leader, sur l'axe leader→file, + voie latérale.
    const my = chain.current[index]
    const targetX = leader.x + lane
    const targetZ = leader.z + TRAIL_GAP * (index + 1)

    if (!my) {
      // 1re frame : on initialise. Si arrivée spectaculaire, on SPAWN au bord.
      if (arriving && !settled.current) {
        const dir = _dir.set(leader.x, 0, leader.z).normalize()
        if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1)
        chain.current[index] = {
          x: leader.x + dir.x * 14,
          z: leader.z + dir.z * 14,
        }
      } else {
        chain.current[index] = { x: targetX, z: targetZ }
      }
      return
    }

    if (!settled.current && arriving) {
      // COURSE : interpole du bord vers la place, piloté par le spring run.t.
      const t = run.t.get()
      const dir = _dir.set(leader.x, 0, leader.z)
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1)
      dir.normalize()
      const spawnX = leader.x + dir.x * 14
      const spawnZ = leader.z + dir.z * 14
      my.x = THREE.MathUtils.lerp(spawnX, targetX, t)
      my.z = THREE.MathUtils.lerp(spawnZ, targetZ, t)
      // Déclenche le nuage quand la course se termine.
      if (t > 0.92 && !dust) {
        setDust(true)
        window.clearTimeout(dustTimer.current)
        dustTimer.current = window.setTimeout(() => setDust(false), 900)
      }
    } else {
      // SUIVI fluide « canard » : amortissement exponentiel vers la cible.
      const k = 1 - Math.exp(-FOLLOW_STIFFNESS * dt)
      my.x += (targetX - my.x) * k
      my.z += (targetZ - my.z) * k
    }

    // Sautillement : rapide & ample pendant la course, léger en suivi
    // (ou quand le joueur bouge), quasi nul à l'arrêt.
    const moving =
      Math.abs(targetX - my.x) > 0.01 || Math.abs(targetZ - my.z) > 0.01
    const t = stateThree.clock.elapsedTime
    let hop: number
    if (!settled.current && arriving) {
      hop = Math.abs(Math.sin(t * 13 + bobPhase)) * 0.32
    } else {
      const amp = moving ? 0.16 : 0.04
      hop = Math.abs(Math.sin(t * 7 + bobPhase)) * amp
    }

    g.position.set(my.x, hop, my.z)
    // Oriente le mini-pion vers son leader (regard « je te suis »).
    const dx = leader.x - my.x
    const dz = leader.z - my.z
    if (dx * dx + dz * dz > 1e-4) g.rotation.y = Math.atan2(dx, dz)

    // Halo d'arrivée : intensité modulée (pas de mount/unmount de light).
    if (haloRef.current) {
      haloRef.current.intensity = !settled.current && arriving ? 2.4 : 0
    }
  })

  useEffect(() => () => window.clearTimeout(dustTimer.current), [])

  return (
    <group ref={groupRef}>
      <group scale={0.45}>
        <mesh castShadow position={[0, 0.3, 0]}>
          <coneGeometry args={[0.24, 0.55, 16]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
        <sprite position={[0, 0.85, 0]} scale={[0.55, 0.55, 0.55]}>
          <spriteMaterial map={tex} transparent depthWrite={false} />
        </sprite>
      </group>
      {dust && <ArrivalBurst color={color} />}
      {/* Halo discret tant que l'allié court (toujours monté, intensité pilotée
          dans useFrame → halo à 0 hors course, sans toucher au nombre de lights). */}
      <pointLight ref={haloRef} position={[0, 0.6, 0]} intensity={0} distance={2.4} color="#fff2c0" />
    </group>
  )
}

/** Nuage de poussière + étincelles one-shot au moment où l'allié se pose. */
function ArrivalBurst({ color }: { color: string }) {
  return (
    <group position={[0, 0.18, 0]}>
      <Sparkles count={16} scale={[0.9, 0.5, 0.9]} size={3.2} speed={0.9} color="#ffe9a0" opacity={0.9} />
      <DustPuffs color={color} />
    </group>
  )
}

/** Quelques petites sphères qui s'écartent et s'effacent (poussière). */
function DustPuffs({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null)
  const start = useRef<number | null>(null)
  // 6 puffs répartis en cercle, vitesses dérivées de l'index (déterministe).
  const puffs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return { dx: Math.cos(a), dz: Math.sin(a), sp: 0.9 + (i % 3) * 0.25 }
      }),
    [],
  )
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime
    const e = clock.elapsedTime - start.current
    const g = ref.current
    if (!g) return
    const k = Math.min(e / 0.7, 1)
    g.children.forEach((child, i) => {
      const p = puffs[i]
      child.position.set(p.dx * p.sp * k, 0.05 + k * 0.3, p.dz * p.sp * k)
      const s = (1 - k) * 0.5 + 0.02
      child.scale.setScalar(s)
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
      mat.opacity = 1 - k
    })
  })
  return (
    <group ref={ref}>
      {puffs.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color={color} transparent opacity={0.9} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}
