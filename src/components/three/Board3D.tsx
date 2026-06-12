// ============================================================
// Board3D.tsx — Le plateau Woody Woods en 3D : cases cylindres,
// chemins, arbres, panneaux, Étoile et Boo. Les cases candidates
// d'un embranchement sont cliquables.
// ============================================================

import { Suspense, useMemo, useRef, useState } from 'react'
import { Html, Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  BOARD,
  FORK_IDS,
  MOLE_SPACE_ID,
  SHOP_SPACE_ID,
  SIGNPOST_FORK_IDS,
  SPACE_IDS,
  TREE_BAD_IDS,
  TREE_GOOD_IDS,
  WALL_SPACE_IDS,
  getActiveBoardDef,
  getSpace,
  spaceWorldPos,
} from '../../game/board'
import { assetUrl } from '../../game/assets'
import { effectiveSpaceType, getCurrentPlayer } from '../../game/reducer'
import type { GameState, SpaceType } from '../../game/types'
import { grassTexture, labelTexture, spriteTexture, woodTexture } from './textures'
import { SPACE_TYPE_LABELS } from '../ui/labels'
import { FittedModel, ModelErrorBoundary, type ModelSlot } from './Models'

const SPACE_COLORS: Record<SpaceType, string> = {
  START: '#7cb342',
  BLUE: '#3d7bf5',
  RED: '#e8403a',
  EVENT: '#46c46e',
  ITEM: '#2fae8f',
  LUCKY: '#8bd44a',
  BAD_LUCK: '#7c2d4e',
  VS: '#f59022',
  ALLY: '#e667a0',
  SIP_PLUS: '#d97706',
  SIP_MINUS: '#0d9488',
}

const SPACE_LABELS: Partial<Record<SpaceType, { text: string; color?: string }>> = {
  START: { text: 'GO' },
  EVENT: { text: '!' },
  ITEM: { text: '🍄' },
  LUCKY: { text: '🍀' },
  BAD_LUCK: { text: '💀' },
  VS: { text: 'VS' },
  ALLY: { text: '🤝' },
  SIP_PLUS: { text: '🍺' },
  SIP_MINUS: { text: '🍻' },
}

interface BoardProps {
  state: GameState
  chooseFork: (spaceId: string) => void
  /** Modèles .glb custom par emplacement (banque / uploads). */
  models?: Partial<Record<ModelSlot, string>>
}

export function Board3D({ state, chooseFork, models = {} }: BoardProps) {
  const player = getCurrentPlayer(state)
  const debug = state.mode === 'DEBUG'
  const [hovered, setHovered] = useState<string | null>(null)
  const forkCandidates = useMemo(() => {
    if (state.phase !== 'FORK_CHOICE' || !player) return []
    const cameFrom = state.movement?.cameFrom ?? null
    return getSpace(player.currentSpaceId).nextSpaces.filter((id) => id !== cameFrom)
  }, [state.phase, state.movement?.cameFrom, player])

  return (
    <group>
      <Ground />
      <PathEdges />
      {SPACE_IDS.map((id) => (
        <Space3D
          key={id}
          id={id}
          type={effectiveSpaceType(state, id)}
          isCurrent={player?.currentSpaceId === id}
          isForkCandidate={forkCandidates.includes(id)}
          onPick={() => chooseFork(id)}
          onHover={debug ? setHovered : undefined}
        />
      ))}
      <Walls3D walls={state.walls} />
      {debug && hovered && <DebugSpaceTip id={hovered} cursed={state.cursedSpaceIds.includes(hovered)} />}
      <StarBeacon spaceId={state.starSpaceId} modelUrl={models.STAR ?? null} />
      <BooGhost modelUrl={models.BOO ?? null} />
      <MoleNpc modelUrl={models.MOLE ?? null} />
      <ShopStand />
      <EventTrees goodUrl={models.TREE_GOOD ?? null} badUrl={models.TREE_BAD ?? null} />
      <DecorTrees />
      <BoardDecor />
      <Signposts signposts={state.signposts} />
    </group>
  )
}

// ---------- Sol & chemins ----------

function Ground() {
  const grass = useMemo(() => grassTexture(), [])
  return (
    <group>
      {/* plateau herbeux de l'île */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
        <circleGeometry args={[27, 72]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {/* flanc de terre de l'île */}
      <mesh position-y={-0.85}>
        <cylinderGeometry args={[27, 24.5, 1.6, 72, 1, true]} />
        <meshStandardMaterial color="#4a3320" roughness={1} />
      </mesh>
      {/* sous-bois lointain */}
      <mesh rotation-x={-Math.PI / 2} position-y={-1.6}>
        <planeGeometry args={[240, 210]} />
        <meshStandardMaterial color="#0b1810" roughness={1} />
      </mesh>
      {/* lucioles de la forêt */}
      <Sparkles count={110} scale={[44, 5, 34]} position={[0, 2.2, 0]} size={2.6} speed={0.25} color="#ffe9a0" opacity={0.65} />
    </group>
  )
}

function PathEdges() {
  const edges = useMemo(() => {
    const seen = new Set<string>()
    const out: {
      key: string
      pos: [number, number, number]
      rotY: number
      len: number
      /** Praticable dans les deux sens (connecteurs) : pas de chevron. */
      twoWay: boolean
    }[] = []
    for (const space of Object.values(BOARD)) {
      for (const next of space.nextSpaces) {
        const pairKey = space.id < next ? `${space.id}|${next}` : `${next}|${space.id}`
        if (seen.has(pairKey)) continue
        seen.add(pairKey)
        const to = getSpace(next)
        const dx = to.x - space.x
        const dz = to.y - space.y
        const len = Math.hypot(dx, dz)
        out.push({
          key: pairKey,
          pos: [space.x + dx / 2, 0.01, space.y + dz / 2],
          // orienté DANS LE SENS DE CIRCULATION (space → next)
          rotY: -Math.atan2(dz, dx),
          len: Math.max(0.2, len - 0.7),
          twoWay: to.nextSpaces.includes(space.id),
        })
      }
    }
    return out
  }, [])

  return (
    <group>
      {edges.map((e) => (
        <group key={e.key} position={e.pos} rotation-y={e.rotY}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[e.len, 0.07, 0.36]} />
            <meshStandardMaterial
              map={woodTexture()}
              color={e.twoWay ? '#e8d4a4' : '#ffffff'}
              roughness={0.85}
            />
          </mesh>
          {/* Chevron = SENS UNIQUE : on ne peut parcourir ce tronçon que dans ce sens */}
          {!e.twoWay && (
            <mesh position-y={0.045} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.15, 3]} />
              <meshBasicMaterial color="#6b4426" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

// ---------- Cases ----------

interface SpaceProps {
  id: string
  type: SpaceType
  isCurrent: boolean
  isForkCandidate: boolean
  onPick: () => void
  /** Mode DEBUG : signale la case survolée (tooltip God Mode). */
  onHover?: (id: string | null) => void
}

function Space3D({ id, type, isCurrent, isForkCandidate, onPick, onHover }: SpaceProps) {
  const space = getSpace(id)
  const meshRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Group>(null)
  const label = SPACE_LABELS[type]
  const labelTex = useMemo(
    () => (label ? labelTexture(label.text, label.color ?? '#ffffff') : null),
    [label],
  )

  useFrame(({ clock }) => {
    if (isForkCandidate && meshRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 5) * 0.08
      meshRef.current.scale.setScalar(pulse)
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1)
    }
    if (arrowRef.current) {
      arrowRef.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 4) * 0.18
      arrowRef.current.rotation.y = clock.elapsedTime * 1.6
    }
  })

  return (
    <group position={[space.x, 0, space.y]}>
      {/* socle de pierre */}
      <mesh castShadow receiveShadow position-y={0.045}>
        <cylinderGeometry args={[0.52, 0.58, 0.09, 28]} />
        <meshStandardMaterial color="#7d766a" roughness={0.95} />
      </mesh>
      {/* pastille colorée vernie */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position-y={0.135}
        onClick={isForkCandidate ? (e) => { e.stopPropagation(); onPick() } : undefined}
        onPointerOver={() => {
          if (isForkCandidate) document.body.style.cursor = 'pointer'
          onHover?.(id)
        }}
        onPointerOut={() => {
          if (isForkCandidate) document.body.style.cursor = 'auto'
          onHover?.(null)
        }}
      >
        <cylinderGeometry args={[0.42, 0.47, 0.1, 28]} />
        <meshStandardMaterial
          color={SPACE_COLORS[type]}
          roughness={0.25}
          metalness={0.08}
          emissive={isForkCandidate ? '#ffd54a' : isCurrent ? '#ffffff' : SPACE_COLORS[type]}
          emissiveIntensity={isForkCandidate ? 0.55 : isCurrent ? 0.2 : 0.07}
        />
      </mesh>
      {labelTex && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.19}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshBasicMaterial map={labelTex} transparent depthWrite={false} />
        </mesh>
      )}
      {space.starSpot && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
          <ringGeometry args={[0.52, 0.62, 32]} />
          <meshBasicMaterial color="#f6c244" transparent opacity={0.55} />
        </mesh>
      )}
      {isForkCandidate && (
        <group ref={arrowRef} position-y={1.5}>
          <mesh rotation-x={Math.PI}>
            <coneGeometry args={[0.26, 0.55, 16]} />
            <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={0.7} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/** Modèle custom avec repli sur le rendu par défaut (404, .glb cassé…). */
function CustomOrDefault({
  url,
  height,
  children,
}: {
  url: string | null
  height: number
  children: React.ReactNode
}) {
  if (!url) return <>{children}</>
  return (
    <ModelErrorBoundary key={url} fallback={children}>
      <Suspense fallback={children}>
        <FittedModel url={url} height={height} />
      </Suspense>
    </ModelErrorBoundary>
  )
}

// ---------- Points d'intérêt ----------

function StarBeacon({ spaceId, modelUrl }: { spaceId: string; modelUrl?: string | null }) {
  const ref = useRef<THREE.Group>(null)
  const tex = useMemo(() => spriteTexture('⭐'), [])
  const [x, , z] = spaceWorldPos(spaceId)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 2.2) * 0.15
    ref.current.rotation.y = clock.elapsedTime
  })
  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <CustomOrDefault url={modelUrl ?? null} height={1.3}>
          <sprite scale={[1.25, 1.25, 1.25]}>
            <spriteMaterial map={tex} transparent depthWrite={false} />
          </sprite>
        </CustomOrDefault>
      </group>
      <pointLight position={[0, 2, 0]} color="#ffd54a" intensity={6} distance={6} />
      <Sparkles count={26} scale={[2.2, 2.6, 2.2]} position={[0, 1.5, 0]} size={3.4} speed={0.5} color="#ffe082" />
      <mesh rotation-x={-Math.PI / 2} position-y={0.16}>
        <ringGeometry args={[0.5, 0.66, 32]} />
        <meshBasicMaterial color="#ffe082" transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

function BooGhost({ modelUrl }: { modelUrl: string | null }) {
  const ref = useRef<THREE.Group>(null)
  const tex = useMemo(() => spriteTexture('👻'), [])
  const boo = Object.values(BOARD).find((s) => s.hasBoo)
  useFrame(({ clock }) => {
    if (!ref.current) return
    // flottement fantomatique, modèle custom inclus
    ref.current.position.y = (modelUrl ? 0.55 : 1.3) + Math.sin(clock.elapsedTime * 1.6) * 0.2
  })
  if (!boo) return null
  return (
    <group ref={ref} position={[boo.x + 0.55, 1.3, boo.y - 0.55]}>
      <CustomOrDefault url={modelUrl} height={1.15}>
        <sprite scale={[0.95, 0.95, 0.95]}>
          <spriteMaterial map={tex} transparent depthWrite={false} opacity={0.92} />
        </sprite>
      </CustomOrDefault>
    </group>
  )
}

// ---------- Arbres ----------

interface TreeProps {
  position: [number, number, number]
  scale?: number
  foliage?: string
  trunk?: string
  /** 'pine' = sapin étagé, 'round' = feuillu en grappes. */
  variant?: 'pine' | 'round'
  /** Légère rotation pour casser la répétition. */
  twist?: number
}

/** Éclaircit/assombrit une couleur hex (pour nuancer les grappes de feuillage). */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, v + amt))
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`
}

function Tree({
  position,
  scale = 1,
  foliage = '#1d3b1f',
  trunk = '#5b3a1e',
  variant = 'pine',
  twist = 0,
}: TreeProps) {
  return (
    <group position={position} scale={scale} rotation-y={twist}>
      {/* tronc légèrement évasé */}
      <mesh castShadow position-y={0.34}>
        <cylinderGeometry args={[0.1, 0.18, 0.72, 9]} />
        <meshStandardMaterial color={trunk} roughness={0.95} />
      </mesh>
      {variant === 'pine' ? (
        <>
          <mesh castShadow position-y={0.92} rotation-z={0.03}>
            <coneGeometry args={[0.66, 1.0, 9]} />
            <meshStandardMaterial color={foliage} roughness={0.85} flatShading />
          </mesh>
          <mesh castShadow position-y={1.46} rotation-z={-0.04}>
            <coneGeometry args={[0.5, 0.85, 9]} />
            <meshStandardMaterial color={shade(foliage, 14)} roughness={0.85} flatShading />
          </mesh>
          <mesh castShadow position-y={1.95}>
            <coneGeometry args={[0.32, 0.65, 9]} />
            <meshStandardMaterial color={shade(foliage, 26)} roughness={0.85} flatShading />
          </mesh>
        </>
      ) : (
        <>
          <mesh castShadow position={[0, 1.12, 0]}>
            <dodecahedronGeometry args={[0.58, 0]} />
            <meshStandardMaterial color={foliage} roughness={0.8} flatShading />
          </mesh>
          <mesh castShadow position={[0.42, 0.92, 0.12]}>
            <dodecahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color={shade(foliage, 18)} roughness={0.8} flatShading />
          </mesh>
          <mesh castShadow position={[-0.36, 0.98, -0.16]}>
            <dodecahedronGeometry args={[0.36, 0]} />
            <meshStandardMaterial color={shade(foliage, -12)} roughness={0.8} flatShading />
          </mesh>
          <mesh castShadow position={[-0.05, 1.55, 0.08]}>
            <dodecahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color={shade(foliage, 30)} roughness={0.8} flatShading />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Petit buisson en grappe. */
function Bush({ position, scale = 1, color = '#2d4f26' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position-y={0.22}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
      <mesh castShadow position={[0.25, 0.16, 0.08]}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={shade(color, 16)} roughness={0.85} flatShading />
      </mesh>
    </group>
  )
}

/** Rocher facetté. */
function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh castShadow receiveShadow position={[position[0], 0.16 * scale, position[2]]} scale={scale} rotation-y={position[0]}>
      <dodecahedronGeometry args={[0.32, 0]} />
      <meshStandardMaterial color="#75706a" roughness={0.95} flatShading />
    </mesh>
  )
}

/** Centre (x, z) d'un groupe de cases. */
function centroid(ids: string[]): [number, number] {
  const pts = ids.map((id) => getSpace(id))
  const x = pts.reduce((a, p) => a + p.x, 0) / Math.max(1, pts.length)
  const y = pts.reduce((a, p) => a + p.y, 0) / Math.max(1, pts.length)
  return [x, y]
}

function EventTrees({ goodUrl, badUrl }: { goodUrl: string | null; badUrl: string | null }) {
  // Chaque arbre trône au centre de SES 3 cases événement, décalé hors du chemin.
  if (TREE_GOOD_IDS.length === 0 || TREE_BAD_IDS.length === 0) return null
  const [gx, gy] = centroid(TREE_GOOD_IDS)
  const [bx, by] = centroid(TREE_BAD_IDS)
  return (
    <group>
      {/* L'arbre généreux, au cœur de ses 3 cases */}
      <group position={[gx - 1.3, 0, gy + 1.5]}>
        <CustomOrDefault url={goodUrl} height={3.4}>
          <group>
            <Tree position={[0, 0, 0]} scale={2.1} foliage="#2e7d32" variant="round" />
            <mesh position={[0.45, 2.3, 0.25]} castShadow>
              <sphereGeometry args={[0.12, 10, 8]} />
              <meshStandardMaterial color="#ef5350" />
            </mesh>
            <mesh position={[-0.4, 2.8, -0.15]} castShadow>
              <sphereGeometry args={[0.12, 10, 8]} />
              <meshStandardMaterial color="#ffca28" />
            </mesh>
            <mesh position={[0.1, 3.1, 0.3]} castShadow>
              <sphereGeometry args={[0.12, 10, 8]} />
              <meshStandardMaterial color="#66bb6a" />
            </mesh>
          </group>
        </CustomOrDefault>
      </group>
      {/* L'arbre maudit, au cœur de ses 3 cases */}
      <group position={[bx - 1.4, 0, by - 1.4]}>
        <CustomOrDefault url={badUrl} height={3.5}>
          <Tree position={[0, 0, 0]} scale={2.2} foliage="#5b2a86" trunk="#3b2417" variant="round" />
        </CustomOrDefault>
        <pointLight position={[0, 2.4, 0]} color="#9c4dcc" intensity={3} distance={6} />
      </group>
    </group>
  )
}

/** L'étal de Flutter : auvent rayé + papillon qui voltige. */
function ShopStand() {
  const ref = useRef<THREE.Sprite>(null)
  const tex = useMemo(() => spriteTexture('🦋'), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 2.4) * 0.18
    ref.current.position.x = Math.sin(clock.elapsedTime * 1.1) * 0.25
  })
  if (!SHOP_SPACE_ID) return null
  const space = getSpace(SHOP_SPACE_ID)
  return (
    <group position={[space.x + 1.0, 0, space.y + 0.4]}>
      {/* comptoir */}
      <mesh castShadow position-y={0.3}>
        <boxGeometry args={[0.9, 0.6, 0.5]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.9} />
      </mesh>
      {/* poteaux */}
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} castShadow position={[x, 0.85, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1.1, 8]} />
          <meshStandardMaterial color="#6d4424" roughness={0.9} />
        </mesh>
      ))}
      {/* auvent rayé */}
      <mesh castShadow position-y={1.45} rotation-x={0.18}>
        <boxGeometry args={[1.15, 0.06, 0.75]} />
        <meshStandardMaterial color="#e8554f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.43, 0.12]} rotation-x={0.18}>
        <boxGeometry args={[1.16, 0.07, 0.24]} />
        <meshStandardMaterial color="#f6f1e6" roughness={0.7} />
      </mesh>
      {/* marchandise */}
      <mesh castShadow position={[-0.22, 0.66, 0.1]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#ef5350" />
      </mesh>
      <mesh castShadow position={[0.16, 0.66, -0.05]}>
        <boxGeometry args={[0.16, 0.12, 0.14]} />
        <meshStandardMaterial color="#ffd54a" />
      </mesh>
      <sprite ref={ref} position-y={1.5} scale={[0.6, 0.6, 0.6]}>
        <spriteMaterial map={tex} transparent depthWrite={false} />
      </sprite>
    </group>
  )
}

/** Topi Taupe : posté sur sa butte, il héle les passants. */
function MoleNpc({ modelUrl }: { modelUrl: string | null }) {
  const ref = useRef<THREE.Group>(null)
  const tex = useMemo(() => spriteTexture('🦫'), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    // il sort et rentre de son trou
    ref.current.position.y =
      (modelUrl ? 0.1 : 0.75) + Math.abs(Math.sin(clock.elapsedTime * 1.4)) * 0.35
  })
  if (!MOLE_SPACE_ID) return null
  const space = getSpace(MOLE_SPACE_ID)
  return (
    <group position={[space.x + 0.9, 0, space.y - 0.9]}>
      {/* la butte de terre */}
      <mesh castShadow position-y={0.12}>
        <sphereGeometry args={[0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6d4c2f" roughness={1} />
      </mesh>
      <group ref={ref} position-y={0.75}>
        <CustomOrDefault url={modelUrl} height={0.95}>
          <sprite scale={[0.85, 0.85, 0.85]}>
            <spriteMaterial map={tex} transparent depthWrite={false} />
          </sprite>
        </CustomOrDefault>
      </group>
    </group>
  )
}

const DECOR: [number, number, number, string][] = [
  [-15.7, -9.6, 1.5, '#1d3b1f'],
  [-16.6, 1.3, 1.2, '#234a25'],
  [-15.8, 8.3, 1.6, '#1d3b1f'],
  [-8.3, 11.0, 1.3, '#2b5524'],
  [0.6, 11.7, 1.7, '#1d3b1f'],
  [9.0, 11.4, 1.2, '#234a25'],
  [16.3, 9.8, 1.5, '#2b5524'],
  [17.0, -1.0, 1.3, '#234a25'],
  [15.8, -9.3, 1.6, '#1d3b1f'],
  [6.6, -11.2, 1.3, '#2b5524'],
  [-2.6, -11.5, 1.5, '#1d3b1f'],
  [-12.2, -10.6, 1.2, '#234a25'],
]

const BUSHES: [number, number, number][] = [
  [-13.0, 4.9, 1.2],
  [-4.2, 10.2, 1.0],
  [5.0, 10.6, 1.3],
  [13.8, 4.4, 1.1],
  [13.4, -6.2, 1.2],
  [1.8, -10.0, 1.0],
  [-9.8, -8.6, 1.3],
  [-3.4, 3.2, 0.9],
  [7.8, 2.2, 1.0],
]

const ROCKS: [number, number, number][] = [
  [-14.6, -4.0, 1.4],
  [-6.6, 9.6, 1.0],
  [11.6, 8.8, 1.2],
  [15.0, 2.6, 0.9],
  [9.8, -9.2, 1.3],
  [-0.8, 5.0, 0.8],
]

function DecorTrees() {
  return (
    <group>
      {DECOR.map(([x, z, sc, c], i) => (
        <Tree
          key={i}
          position={[x, 0, z]}
          scale={sc}
          foliage={c}
          variant={i % 3 === 1 ? 'round' : 'pine'}
          twist={(i * 1.7) % Math.PI}
        />
      ))}
      {BUSHES.map(([x, z, sc], i) => (
        <Bush key={`b${i}`} position={[x, 0, z]} scale={sc} color={i % 2 ? '#2d4f26' : '#355e2a'} />
      ))}
      {ROCKS.map(([x, z, sc], i) => (
        <Rock key={`r${i}`} position={[x, 0, z]} scale={sc} />
      ))}
    </group>
  )
}

// ---------- Panneaux des embranchements ----------

/** Flèche de panneau : pivote en douceur vers sa nouvelle direction. */
function SignpostArrow({ targetAngle }: { targetAngle: number }) {
  const ref = useRef<THREE.Group>(null)
  const spin = useRef({ current: targetAngle, kick: 0 })

  useFrame((_, delta) => {
    if (!ref.current) return
    const st = spin.current
    // delta d'angle par le plus court chemin
    let diff = targetAngle - st.current
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    if (Math.abs(diff) > 0.01) {
      st.current += diff * Math.min(1, delta * 4.5)
      st.kick = Math.min(1, st.kick + delta * 6) // la flèche "sursaute" pendant la rotation
    } else {
      st.current = targetAngle
      st.kick = Math.max(0, st.kick - delta * 2.5)
    }
    ref.current.rotation.y = st.current
    ref.current.position.y = 1.35 + st.kick * 0.45
    const sc = 1 + st.kick * 0.35
    ref.current.scale.setScalar(sc)
  })

  return (
    <group ref={ref} position-y={1.35}>
      <mesh castShadow rotation-z={-Math.PI / 2} position-x={0.28}>
        <coneGeometry args={[0.24, 0.62, 12]} />
        <meshStandardMaterial color="#ffd54a" emissive="#b8860b" emissiveIntensity={0.55} />
      </mesh>
      <mesh castShadow rotation-z={-Math.PI / 2} position-x={-0.13}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 10]} />
        <meshStandardMaterial color="#ffd54a" emissive="#b8860b" emissiveIntensity={0.55} />
      </mesh>
    </group>
  )
}

function Signposts({ signposts }: { signposts: Record<string, number> }) {
  const freeForks = FORK_IDS.filter((id) => !SIGNPOST_FORK_IDS.includes(id))
  const qTex = useMemo(() => labelTexture('?', '#ffd54a'), [])
  return (
    <group>
      {/* Forks À PANNEAU : la grande flèche dorée DICTE la direction */}
      {SIGNPOST_FORK_IDS.map((forkId, i) => {
        const fork = getSpace(forkId)
        const branchIndex = (signposts[forkId] ?? 0) % fork.nextSpaces.length
        const target = getSpace(fork.nextSpaces[branchIndex])
        const angle = -Math.atan2(target.y - fork.y, target.x - fork.x)
        return (
          <group key={forkId} position={[fork.x + 0.7, 0, fork.y - 0.7]}>
            {/* poteau */}
            <mesh castShadow position-y={0.7}>
              <cylinderGeometry args={[0.07, 0.09, 1.4, 8]} />
              <meshStandardMaterial color="#7a5230" roughness={0.9} />
            </mesh>
            {/* numéro du panneau */}
            <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
              <circleGeometry args={[0.34, 20]} />
              <meshBasicMaterial color="#3b2a14" />
            </mesh>
            <sprite position-y={1.95} scale={[0.55, 0.55, 0.55]}>
              <spriteMaterial map={labelTexture(`${i + 1}`, '#ffe082')} transparent depthWrite={false} />
            </sprite>
            {/* GRANDE flèche directionnelle, qui PIVOTE quand la direction change */}
            <SignpostArrow targetAngle={angle} />
          </group>
        )
      })}
      {/* (fermeture des panneaux ci-dessus) */}
      {/* Forks LIBRES : un simple '?' — au joueur de choisir */}
      {freeForks.map((forkId) => {
        const fork = getSpace(forkId)
        return (
          <sprite key={forkId} position={[fork.x + 0.55, 1.1, fork.y - 0.55]} scale={[0.5, 0.5, 0.5]}>
            <spriteMaterial map={qTex} transparent depthWrite={false} opacity={0.85} />
          </sprite>
        )
      })}
    </group>
  )
}

// ---------- LE MUR : visible, avec sa solidité ----------

/** Mur de briques en travers du chemin ; le chiffre = lancer minimum pour le casser. */
function Walls3D({ walls }: { walls: Record<string, number> }) {
  return (
    <group>
      {WALL_SPACE_IDS.map((id) => {
        const strength = walls[id] ?? 0
        if (strength <= 0) return null
        const sp = getSpace(id)
        // perpendiculaire au chemin : on s'appuie sur les deux voisins du tronçon
        const a = getSpace(sp.nextSpaces[0])
        const b = getSpace(sp.nextSpaces[1] ?? sp.nextSpaces[0])
        const angle = -Math.atan2(a.y - b.y, a.x - b.x) + Math.PI / 2
        const cracked = 1 - strength / 6 // plus c'est faible, plus c'est sombre/abîmé
        const brick = `hsl(18, ${52 - cracked * 25}%, ${44 - cracked * 16}%)`
        return (
          <group key={id} position={[sp.x, 0, sp.y]} rotation-y={angle}>
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => (
                <mesh
                  key={`${row}-${col}`}
                  castShadow
                  position={[
                    (col - 1) * 0.46 + (row % 2 === 1 ? 0.23 : 0),
                    0.2 + row * 0.34,
                    0,
                  ]}
                  rotation-z={cracked > 0.4 && (row + col) % 3 === 0 ? 0.12 : 0}
                >
                  <boxGeometry args={[0.42, 0.3, 0.2]} />
                  <meshStandardMaterial color={brick} roughness={0.95} />
                </mesh>
              )),
            )}
            <sprite position-y={1.65} scale={[0.85, 0.85, 0.85]}>
              <spriteMaterial
                map={labelTexture(String(strength), '#ffd54a')}
                transparent
                depthWrite={false}
              />
            </sprite>
          </group>
        )
      })}
    </group>
  )
}

// ---------- Tooltip God Mode : infos de la case survolée ----------

function DebugSpaceTip({ id, cursed }: { id: string; cursed?: boolean }) {
  const sp = getSpace(id)
  const extras: string[] = []
  if (sp.event) extras.push(`event: ${sp.event}`)
  if (sp.starSpot) extras.push('starSpot')
  if (sp.hasBoo) extras.push('Boo')
  if (sp.hasMole) extras.push('Topi Taupe')
  if (sp.hasShop) extras.push('Boutique 🦋')
  if (sp.wall) extras.push('MUR')
  if (cursed) extras.push('🔮 MAUDITE (caché)')
  return (
    <group position={[sp.x, 2.1, sp.y]}>
      <Html center distanceFactor={16} zIndexRange={[60, 60]}>
        <div className="pointer-events-none rounded-xl bg-black/85 px-3 py-2 text-left whitespace-nowrap shadow-xl ring-1 ring-amber-400/60">
          <p className="font-mono text-sm font-bold text-amber-300">{id}</p>
          <p className="text-xs font-bold text-white/90">{SPACE_TYPE_LABELS[sp.type]}</p>
          <p className="text-[10px] font-semibold text-white/60">→ {sp.nextSpaces.join(', ')}</p>
          {extras.length > 0 && (
            <p className="text-[10px] font-semibold text-emerald-300">{extras.join(' · ')}</p>
          )}
        </div>
      </Html>
    </group>
  )
}

// ---------- Décor libre posé via l'éditeur de l'Atelier ----------

function BoardDecor() {
  const def = getActiveBoardDef()
  const items = def.decor ?? []
  if (items.length === 0) return null
  return (
    <group>
      {items.map((d) => (
        <group
          key={d.id}
          position={[d.x * def.scale, 0, d.y * def.scale]}
          rotation-y={(d.rotY * Math.PI) / 180}
        >
          <ModelErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <FittedModel url={assetUrl(d.file)} height={d.scale} />
            </Suspense>
          </ModelErrorBoundary>
        </group>
      ))}
    </group>
  )
}
