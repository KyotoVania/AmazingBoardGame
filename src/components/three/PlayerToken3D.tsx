// ============================================================
// PlayerToken3D.tsx — Pion 3D d'un joueur. Saute en arc
// parabolique de case en case (react-spring) et signale chaque
// pas au moteur via onHopDone → STEP_DONE.
// ============================================================

import { animated, easings, useSpring } from '@react-spring/three'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { spaceWorldPos } from '../../game/board'
import { CHARACTERS } from '../../game/constants'
import type { Player } from '../../game/types'
import { AllyEntourage } from './AllyEntourage'
import { FittedModel, ModelErrorBoundary } from './Models'
import { avatarTextureCache, circularImageTexture, spriteTexture } from './textures'

/** Décalage par joueur pour éviter l'empilement sur une même case. */
export const OFFSETS: [number, number][] = [
  [-0.26, -0.26],
  [0.26, -0.26],
  [-0.26, 0.26],
  [0.26, 0.26],
]

/**
 * Position MONDE exacte du pion d'un joueur (offset par joueur compris),
 * pour que la caméra cadre le pion et non le centre de la case.
 */
export function pawnWorldPos(spaceId: string, playerIndex: number): [number, number, number] {
  const [x, , z] = spaceWorldPos(spaceId)
  const offset = OFFSETS[playerIndex % OFFSETS.length]
  return [x + offset[0], 0.14, z + offset[1]]
}
const JUMP_HEIGHT = 0.95
const HOP_MS = 430

interface Props {
  player: Player
  index: number
  isCurrent: boolean
  /** Case cible du saut en cours (uniquement pour le pion qui bouge). */
  hopTo: string | null
  /** Modèle .glb custom (Config Panel) remplaçant le pion par défaut. */
  modelUrl: string | null
  onHopDone: () => void
}

export function PlayerToken3D({ player, index, isCurrent, hopTo, modelUrl, onHopDone }: Props) {
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
    if (dest[0] === posRef.current[0] && dest[1] === posRef.current[1]) {
      // Rien à animer (ex. deux cases superposées sur une map custom) :
      // le moteur attend quand même la fin du pas, sinon SOFTLOCK.
      if (isCurrent && hopTo === targetId) onHopDone()
      return
    }
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
  const avatarTex = useAvatarTexture(player.avatarUrl)
  const headTex = avatarTex ?? charTex

  return (
    <>
      <animated.group position-x={x} position-y={y} position-z={z}>
        {modelUrl ? (
          // Modèle .glb custom : normalisé par FittedModel, pion par défaut en
          // attendant (et en secours si le fichier est introuvable/cassé)
          <ModelErrorBoundary key={modelUrl} fallback={<DefaultPawn color={player.color} />}>
            <Suspense fallback={<DefaultPawn color={player.color} />}>
              <FittedModel url={modelUrl} height={1.05} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <DefaultPawn color={player.color} />
        )}
        <sprite
          position={[0, modelUrl ? 1.5 : 1.26, 0]}
          scale={avatarTex ? [0.66, 0.66, 0.66] : [0.5, 0.5, 0.5]}
        >
          <spriteMaterial map={headTex} transparent depthWrite={false} />
        </sprite>
        {isCurrent && <CurrentRing color={player.color} />}
      </animated.group>
      {/* La suite d'alliés vit en repère MONDE (hors du group animé du pion)
          pour traîner derrière lui en file indienne, et débarquer en courant
          depuis le bord du plateau. */}
      <AllyEntourage
        allies={player.allies ?? []}
        color={player.color}
        leaderX={x}
        leaderZ={z}
      />
    </>
  )
}

/** Le pion par défaut : socle + corps galbé + collerette + tête vernie. */
function DefaultPawn({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 0.1, 24]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 0.38, 0]}>
        <coneGeometry args={[0.24, 0.6, 24]} />
        <meshStandardMaterial color={color} roughness={0.22} metalness={0.12} />
      </mesh>
      <mesh castShadow position={[0, 0.62, 0]}>
        <torusGeometry args={[0.12, 0.045, 12, 24]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.17, 28, 20]} />
        <meshStandardMaterial color={color} roughness={0.18} metalness={0.12} />
      </mesh>
    </group>
  )
}

/** Charge (et met en cache) la texture ronde d'un avatar custom. */
function useAvatarTexture(url: string | null): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(() =>
    url ? (avatarTextureCache.get(url) ?? null) : null,
  )
  useEffect(() => {
    if (!url) {
      setTex(null)
      return
    }
    const cached = avatarTextureCache.get(url)
    if (cached) {
      setTex(cached)
      return
    }
    let alive = true
    const img = new Image()
    img.onload = () => {
      const t = circularImageTexture(img)
      avatarTextureCache.set(url, t)
      if (alive) setTex(t)
    }
    img.src = url
    return () => {
      alive = false
    }
  }, [url])
  return tex
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
