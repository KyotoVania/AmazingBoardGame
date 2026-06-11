// ============================================================
// Board3D.tsx — Le plateau Woody Woods en 3D : cases cylindres,
// chemins, arbres, panneaux, Étoile et Boo. Les cases candidates
// d'un embranchement sont cliquables.
// ============================================================

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOARD, FORK_IDS, SPACE_IDS, getSpace, spaceWorldPos } from '../../game/board'
import { effectiveSpaceType, getCurrentPlayer } from '../../game/reducer'
import type { GameState, SpaceType } from '../../game/types'
import { labelTexture, spriteTexture } from './textures'

const SPACE_COLORS: Record<SpaceType, string> = {
  START: '#7cb342',
  BLUE: '#3d7bf5',
  RED: '#e8403a',
  EVENT: '#46c46e',
  ITEM: '#2fae8f',
  LUCKY: '#8bd44a',
  BAD_LUCK: '#7c2d4e',
  VS: '#f59022',
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
  SIP_PLUS: { text: '🍺' },
  SIP_MINUS: { text: '🍻' },
}

interface BoardProps {
  state: GameState
  chooseFork: (spaceId: string) => void
}

export function Board3D({ state, chooseFork }: BoardProps) {
  const player = getCurrentPlayer(state)
  const forkCandidates = useMemo(() => {
    if (state.phase !== 'FORK_CHOICE' || !player) return []
    return getSpace(player.currentSpaceId).nextSpaces
  }, [state.phase, player])

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
        />
      ))}
      <StarBeacon spaceId={state.starSpaceId} />
      <BooGhost />
      <EventTrees />
      <DecorTrees />
      <Signposts signposts={state.signposts} />
    </group>
  )
}

// ---------- Sol & chemins ----------

function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
        <planeGeometry args={[46, 34]} />
        <meshStandardMaterial color="#2c4a26" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.12}>
        <planeGeometry args={[140, 120]} />
        <meshStandardMaterial color="#16280f" roughness={1} />
      </mesh>
    </group>
  )
}

function PathEdges() {
  const edges = useMemo(() => {
    const out: { key: string; pos: [number, number, number]; rotY: number; len: number }[] = []
    for (const space of Object.values(BOARD)) {
      for (const next of space.nextSpaces) {
        const to = getSpace(next)
        const dx = to.x - space.x
        const dz = to.y - space.y
        const len = Math.hypot(dx, dz)
        out.push({
          key: `${space.id}-${next}`,
          pos: [space.x + dx / 2, 0.01, space.y + dz / 2],
          rotY: -Math.atan2(dz, dx),
          len: Math.max(0.2, len - 0.7),
        })
      }
    }
    return out
  }, [])

  return (
    <group>
      {edges.map((e) => (
        <mesh key={e.key} position={e.pos} rotation-y={e.rotY} receiveShadow>
          <boxGeometry args={[e.len, 0.05, 0.34]} />
          <meshStandardMaterial color="#c9a96a" roughness={0.9} />
        </mesh>
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
}

function Space3D({ id, type, isCurrent, isForkCandidate, onPick }: SpaceProps) {
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
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position-y={0.07}
        onClick={isForkCandidate ? (e) => { e.stopPropagation(); onPick() } : undefined}
        onPointerOver={isForkCandidate ? () => (document.body.style.cursor = 'pointer') : undefined}
        onPointerOut={isForkCandidate ? () => (document.body.style.cursor = 'auto') : undefined}
      >
        <cylinderGeometry args={[0.44, 0.48, 0.14, 28]} />
        <meshStandardMaterial
          color={SPACE_COLORS[type]}
          roughness={0.45}
          emissive={isForkCandidate ? '#ffd54a' : isCurrent ? '#ffffff' : '#000000'}
          emissiveIntensity={isForkCandidate ? 0.55 : isCurrent ? 0.18 : 0}
        />
      </mesh>
      {labelTex && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.145}>
          <planeGeometry args={[0.62, 0.62]} />
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

// ---------- Points d'intérêt ----------

function StarBeacon({ spaceId }: { spaceId: string }) {
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
        <sprite scale={[1.25, 1.25, 1.25]}>
          <spriteMaterial map={tex} transparent depthWrite={false} />
        </sprite>
      </group>
      <pointLight position={[0, 2, 0]} color="#ffd54a" intensity={6} distance={6} />
      <mesh rotation-x={-Math.PI / 2} position-y={0.16}>
        <ringGeometry args={[0.5, 0.66, 32]} />
        <meshBasicMaterial color="#ffe082" transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

function BooGhost() {
  const ref = useRef<THREE.Sprite>(null)
  const tex = useMemo(() => spriteTexture('👻'), [])
  const boo = Object.values(BOARD).find((s) => s.hasBoo)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 1.3 + Math.sin(clock.elapsedTime * 1.6) * 0.2
  })
  if (!boo) return null
  return (
    <sprite ref={ref} position={[boo.x + 0.55, 1.3, boo.y - 0.55]} scale={[0.95, 0.95, 0.95]}>
      <spriteMaterial map={tex} transparent depthWrite={false} opacity={0.92} />
    </sprite>
  )
}

// ---------- Arbres ----------

interface TreeProps {
  position: [number, number, number]
  scale?: number
  foliage?: string
  trunk?: string
}

function Tree({ position, scale = 1, foliage = '#1d3b1f', trunk = '#5b3a1e' }: TreeProps) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position-y={0.3}>
        <cylinderGeometry args={[0.11, 0.16, 0.6, 10]} />
        <meshStandardMaterial color={trunk} roughness={0.9} />
      </mesh>
      <mesh castShadow position-y={0.95}>
        <coneGeometry args={[0.62, 1.1, 12]} />
        <meshStandardMaterial color={foliage} roughness={0.8} />
      </mesh>
      <mesh castShadow position-y={1.55}>
        <coneGeometry args={[0.42, 0.85, 12]} />
        <meshStandardMaterial color={foliage} roughness={0.8} />
      </mesh>
    </group>
  )
}

function EventTrees() {
  const good = getSpace('s12')
  const bad = getSpace('s21')
  return (
    <group>
      {/* L'arbre généreux, près de la case TREE_GOOD */}
      <group position={[good.x - 0.4, 0, good.y + 1.1]}>
        <Tree position={[0, 0, 0]} scale={1.6} foliage="#2e7d32" />
        <mesh position={[0.35, 1.7, 0.2]} castShadow>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color="#ef5350" />
        </mesh>
        <mesh position={[-0.3, 2.1, -0.1]} castShadow>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color="#ffca28" />
        </mesh>
      </group>
      {/* L'arbre maudit, près de la case TREE_BAD */}
      <Tree position={[bad.x - 0.5, 0, bad.y - 1.0]} scale={1.7} foliage="#5b2a86" trunk="#3b2417" />
    </group>
  )
}

const DECOR: [number, number, number, string][] = [
  [-9.8, -6.0, 1.3, '#1d3b1f'],
  [-10.4, 0.8, 1.1, '#234a25'],
  [-9.9, 5.2, 1.4, '#1d3b1f'],
  [-5.2, 6.9, 1.2, '#234a25'],
  [0.4, 7.3, 1.5, '#1d3b1f'],
  [5.6, 7.1, 1.1, '#234a25'],
  [10.2, 6.1, 1.3, '#1d3b1f'],
  [10.6, -0.6, 1.2, '#234a25'],
  [9.9, -5.8, 1.4, '#1d3b1f'],
  [4.1, -7.0, 1.2, '#234a25'],
  [-1.6, -7.2, 1.3, '#1d3b1f'],
  [-7.6, -6.6, 1.1, '#234a25'],
]

function DecorTrees() {
  return (
    <group>
      {DECOR.map(([x, z, s, c], i) => (
        <Tree key={i} position={[x, 0, z]} scale={s} foliage={c} />
      ))}
    </group>
  )
}

// ---------- Panneaux des embranchements ----------

function Signposts({ signposts }: { signposts: Record<string, number> }) {
  return (
    <group>
      {FORK_IDS.map((forkId) => {
        const fork = getSpace(forkId)
        const branchIndex = signposts[forkId] ?? 0
        const target = getSpace(fork.nextSpaces[branchIndex] ?? fork.nextSpaces[0])
        const angle = -Math.atan2(target.y - fork.y, target.x - fork.x)
        return (
          <group key={forkId} position={[fork.x + 0.55, 0, fork.y - 0.55]}>
            <mesh castShadow position-y={0.45}>
              <cylinderGeometry args={[0.05, 0.06, 0.9, 8]} />
              <meshStandardMaterial color="#7a5230" roughness={0.9} />
            </mesh>
            <group position-y={0.85} rotation-y={angle}>
              <mesh castShadow rotation-z={-Math.PI / 2}>
                <coneGeometry args={[0.16, 0.5, 10]} />
                <meshStandardMaterial color="#e8b84a" emissive="#7a5b13" emissiveIntensity={0.3} />
              </mesh>
            </group>
          </group>
        )
      })}
    </group>
  )
}
