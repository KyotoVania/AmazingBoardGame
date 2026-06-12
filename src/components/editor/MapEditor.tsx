// ============================================================
// MapEditor.tsx — L'éditeur de plateau de l'Atelier.
// Vue 2D SVG avec l'image source (Docs/imgMap.png) en fond :
// on pose/déplace les cases PILE sur les ronds de l'image, on
// trace les liens (sens unique ou double sens), on règle types
// et drapeaux, la validation tourne en live, et « Jouer cette
// map » injecte le BoardDef dans le moteur (persisté localStorage).
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WOODY_WOODS_DEF,
  getActiveBoardDef,
  setActiveBoard,
  validateBoardDef,
  type BoardDef,
  type BoardSeed,
  type DecorItem,
} from '../../game/board'
import { readCustomBoard, writeCustomBoard } from '../../game/customBoard'
import { assetUrl } from '../../game/assets'
import type { BoardEventKind, SpaceType } from '../../game/types'
import { SPACE_TYPE_LABELS } from '../ui/labels'

const TYPE_COLORS: Record<SpaceType, string> = {
  START: '#7cb342',
  BLUE: '#3d7bf5',
  RED: '#e8403a',
  EVENT: '#46c46e',
  ITEM: '#2fae8f',
  LUCKY: '#8bd44a',
  BAD_LUCK: '#7c2d4e',
  VS: '#f59022',
  ALLY: '#38bdf8',
  BANK: '#43a047',
  REVERSE: '#e11d48',
  WAYPOINT: '#c9b380',
  SIP_PLUS: '#d97706',
  SIP_MINUS: '#0d9488',
}

const SPACE_TYPES = Object.keys(TYPE_COLORS) as SpaceType[]
const EVENT_KINDS: BoardEventKind[] = ['SIGNPOST', 'TREE_GOOD', 'TREE_BAD', 'PIT']
const EVENT_LABELS: Record<BoardEventKind, string> = {
  SIGNPOST: '🪧 Panneau',
  TREE_GOOD: '🌳 Arbre généreux',
  TREE_BAD: '🌳 Arbre maudit',
  PIT: '🕳️ Le trou',
}

type Tool = 'select' | 'add' | 'link' | 'decor' | 'delete'

/** L'image source fait 599×423 px, tracée à l'origine en px/28 centré (300,211). */
const IMG = { x: -300 / 28, y: -211 / 28, w: 599 / 28, h: 423 / 28 }

/** Fusionne les twoWayPairs dans les `next` mutuels : un seul format en édition. */
function normalize(def: BoardDef): BoardDef {
  const d = structuredClone(def)
  for (const [a, b] of d.twoWayPairs ?? []) {
    const sa = d.seeds.find((s) => s.id === a)
    const sb = d.seeds.find((s) => s.id === b)
    if (!sa || !sb) continue
    if (!sa.next.includes(b)) sa.next.push(b)
    if (!sb.next.includes(a)) sb.next.push(a)
  }
  d.twoWayPairs = []
  return d
}

export function MapEditor() {
  const [def, setDef] = useState<BoardDef>(() =>
    normalize(readCustomBoard() ?? getActiveBoardDef()),
  )
  const [tool, setTool] = useState<Tool>('select')
  const [paletteType, setPaletteType] = useState<SpaceType>('BLUE')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linkSource, setLinkSource] = useState<string | null>(null)
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null)
  const [decorBank, setDecorBank] = useState<{ name: string; file: string }[]>([])
  const [decorFile, setDecorFile] = useState<string | null>(null)
  const [vb, setVb] = useState({ x: -12, y: -9.2, w: 24, h: 18.4 })
  const [img, setImg] = useState({ visible: true, opacity: 0.55, scale: 1, dx: 0, dy: 0 })
  const [applied, setApplied] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const histRef = useRef<BoardDef[]>([])
  const dragRef = useRef<
    | { kind: 'space'; id: string }
    | { kind: 'decor'; id: string }
    | { kind: 'pan'; startVb: typeof vb; startX: number; startY: number }
    | null
  >(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Banque de modèles (chemins BRUTS du manifest : les maps exportées
  // restent portables, assetUrl n'est appliqué qu'au rendu 3D)
  useEffect(() => {
    fetch(assetUrl('/models/manifest.json'))
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return
        const entries = data.filter(
          (e): e is { name: string; file: string } =>
            Boolean(e && typeof e === 'object' && 'name' in e && 'file' in e),
        )
        setDecorBank(entries)
        setDecorFile((cur) => cur ?? entries[0]?.file ?? null)
      })
      .catch(() => {})
  }, [])

  const byId = useMemo(() => new Map(def.seeds.map((s) => [s.id, s])), [def])
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null
  const validation = useMemo(() => validateBoardDef(def), [def])
  const customActive = readCustomBoard() !== null

  // ---------- mutations (avec historique) ----------

  const pushHist = (snapshot: BoardDef) => {
    histRef.current.push(structuredClone(snapshot))
    if (histRef.current.length > 60) histRef.current.shift()
  }

  const apply = (fn: (d: BoardDef) => void, snapshot = true) => {
    setDef((prev) => {
      if (snapshot) pushHist(prev)
      const d = structuredClone(prev)
      fn(d)
      return d
    })
  }

  const undo = () => {
    const prev = histRef.current.pop()
    if (prev) setDef(prev)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- coordonnées ----------

  const toPoint = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: Math.round(p.x * 20) / 20, y: Math.round(p.y * 20) / 20 }
  }

  // ---------- outils ----------

  const nextId = (d: BoardDef) => {
    let n = 1
    while (d.seeds.some((s) => s.id === `n${String(n).padStart(2, '0')}`)) n += 1
    return `n${String(n).padStart(2, '0')}`
  }

  const addSpace = (x: number, y: number) => {
    apply((d) => {
      const id = nextId(d)
      d.seeds.push({ id, type: paletteType, x, y, next: [] })
    })
  }

  const deleteSpace = (id: string) => {
    apply((d) => {
      d.seeds = d.seeds.filter((s) => s.id !== id)
      for (const s of d.seeds) s.next = s.next.filter((n) => n !== id)
      d.twoWayPairs = (d.twoWayPairs ?? []).filter(([a, b]) => a !== id && b !== id)
    })
    if (selectedId === id) setSelectedId(null)
    if (linkSource === id) setLinkSource(null)
  }

  const addDecor = (x: number, y: number) => {
    if (!decorFile) return
    apply((d) => {
      let n = 1
      while ((d.decor ?? []).some((it) => it.id === `d${String(n).padStart(2, '0')}`)) n += 1
      d.decor = [
        ...(d.decor ?? []),
        { id: `d${String(n).padStart(2, '0')}`, file: decorFile, x, y, scale: 1.4, rotY: 0 },
      ]
    })
  }

  const deleteDecor = (id: string) => {
    apply((d) => {
      d.decor = (d.decor ?? []).filter((it) => it.id !== id)
    })
    if (selectedDecorId === id) setSelectedDecorId(null)
  }

  const patchDecor = (id: string, patch: Partial<DecorItem>, snapshot = true) => {
    apply((d) => {
      const it = (d.decor ?? []).find((x) => x.id === id)
      if (it) Object.assign(it, patch)
    }, snapshot)
  }

  const selectedDecor = selectedDecorId
    ? (def.decor ?? []).find((it) => it.id === selectedDecorId) ?? null
    : null

  /** none → a→b → a↔b → none */
  const cycleEdge = (aId: string, bId: string) => {
    apply((d) => {
      const a = d.seeds.find((s) => s.id === aId)
      const b = d.seeds.find((s) => s.id === bId)
      if (!a || !b || a.id === b.id) return
      const aToB = a.next.includes(bId)
      const bToA = b.next.includes(aId)
      if (!aToB && !bToA) a.next.push(bId)
      else if (aToB && !bToA) b.next.push(aId)
      else {
        a.next = a.next.filter((n) => n !== bId)
        b.next = b.next.filter((n) => n !== aId)
      }
    })
  }

  const onSpacePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    if (tool === 'select') {
      setSelectedId(id)
      pushHist(def)
      dragRef.current = { kind: 'space', id }
    } else if (tool === 'link') {
      if (!linkSource) setLinkSource(id)
      else if (linkSource === id) setLinkSource(null)
      else {
        cycleEdge(linkSource, id)
        setLinkSource(id) // enchaîner les liens de proche en proche
      }
    } else if (tool === 'delete') {
      deleteSpace(id)
    } else if (tool === 'add') {
      setSelectedId(id)
    }
  }

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (tool === 'add') {
      const p = toPoint(e)
      addSpace(p.x, p.y)
    } else if (tool === 'decor') {
      const p = toPoint(e)
      setSelectedDecorId(null)
      addDecor(p.x, p.y)
    } else if (tool === 'select') {
      setSelectedId(null)
      setSelectedDecorId(null)
      dragRef.current = { kind: 'pan', startVb: vb, startX: e.clientX, startY: e.clientY }
    } else if (tool === 'link') {
      setLinkSource(null)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.kind === 'space') {
      const p = toPoint(e)
      apply(
        (d) => {
          const s = d.seeds.find((x) => x.id === drag.id)
          if (s) {
            s.x = p.x
            s.y = p.y
          }
        },
        false, // l'historique a été poussé au début du drag
      )
    } else if (drag.kind === 'decor') {
      const p = toPoint(e)
      patchDecor(drag.id, { x: p.x, y: p.y }, false)
    } else {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const kx = drag.startVb.w / rect.width
      const ky = drag.startVb.h / rect.height
      setVb({
        ...drag.startVb,
        x: drag.startVb.x - (e.clientX - drag.startX) * kx,
        y: drag.startVb.y - (e.clientY - drag.startY) * ky,
      })
    }
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const onWheel = (e: React.WheelEvent) => {
    const p = toPoint(e)
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12
    setVb((v) => ({
      x: p.x - (p.x - v.x) * k,
      y: p.y - (p.y - v.y) * k,
      w: v.w * k,
      h: v.h * k,
    }))
  }

  // ---------- actions globales ----------

  const playThisMap = () => {
    if (validation.errors.length > 0) return
    const final = structuredClone(def)
    writeCustomBoard(final)
    setActiveBoard(final)
    setApplied(`✅ « ${final.name} » est maintenant la map active (${final.seeds.length} cases).`)
  }

  const resetWoody = () => {
    writeCustomBoard(null)
    setActiveBoard(WOODY_WOODS_DEF)
    setDef(normalize(WOODY_WOODS_DEF))
    histRef.current = []
    setApplied('↺ Retour au Woody Woods d’origine.')
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${def.name.replace(/\s+/g, '-').toLowerCase() || 'map'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = normalize(JSON.parse(String(reader.result)) as BoardDef)
        if (!parsed.seeds?.length) throw new Error('pas de cases')
        pushHist(def)
        setDef(parsed)
        setSelectedId(null)
      } catch {
        setApplied('❌ JSON illisible : map non importée.')
      }
    }
    reader.readAsText(file)
  }

  // ---------- arêtes à dessiner ----------

  const edges = useMemo(() => {
    const seen = new Set<string>()
    const out: { key: string; a: BoardSeed; b: BoardSeed; twoWay: boolean }[] = []
    for (const s of def.seeds) {
      for (const n of s.next) {
        const t = byId.get(n)
        if (!t) continue
        const twoWay = t.next.includes(s.id)
        const key = s.id < n ? `${s.id}|${n}` : `${n}|${s.id}`
        if (twoWay) {
          if (seen.has(key)) continue
          seen.add(key)
        }
        out.push({ key: `${s.id}->${n}`, a: s, b: t, twoWay })
      }
    }
    return out
  }, [def, byId])

  const imgRect = {
    x: IMG.x * img.scale + img.dx,
    y: IMG.y * img.scale + img.dy,
    w: IMG.w * img.scale,
    h: IMG.h * img.scale,
  }

  // ---------- rendu ----------

  return (
    <div className="flex h-full min-h-0">
      {/* ----- Canvas SVG ----- */}
      <div className="relative min-w-0 flex-1">
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="h-full w-full touch-none bg-[#101d12]"
          onPointerDown={onBackgroundPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#c9a96a" />
            </marker>
          </defs>

          {img.visible && (
            <image
              href={assetUrl('/images/imgMap.png')}
              x={imgRect.x}
              y={imgRect.y}
              width={imgRect.w}
              height={imgRect.h}
              opacity={img.opacity}
              preserveAspectRatio="none"
            />
          )}

          {/* arêtes */}
          {edges.map((e) => {
            const dx = e.b.x - e.a.x
            const dy = e.b.y - e.a.y
            const len = Math.hypot(dx, dy) || 1
            // raccourcir pour ne pas rentrer dans les pastilles
            const pad = 0.36
            const x1 = e.a.x + (dx / len) * pad
            const y1 = e.a.y + (dy / len) * pad
            const x2 = e.b.x - (dx / len) * pad
            const y2 = e.b.y - (dy / len) * pad
            return (
              <g key={e.key}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={e.twoWay ? '#7dd3fc' : '#c9a96a'}
                  strokeWidth={e.twoWay ? 0.1 : 0.07}
                  markerEnd={e.twoWay ? undefined : 'url(#arrow)'}
                />
                {/* zone cliquable large pour cycler/supprimer le lien */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={0.3}
                  className={tool === 'link' || tool === 'delete' ? 'cursor-pointer' : ''}
                  onPointerDown={(ev) => {
                    if (tool !== 'link' && tool !== 'delete') return
                    ev.stopPropagation()
                    cycleEdge(e.a.id, e.b.id)
                    if (tool === 'delete' && !e.twoWay) {
                      // delete = couper net : on re-cycle jusqu'à suppression
                      cycleEdge(e.a.id, e.b.id)
                    }
                  }}
                />
              </g>
            )
          })}

          {/* décor 3D posé librement (losanges verts) */}
          {(def.decor ?? []).map((it) => {
            const isSel = it.id === selectedDecorId
            return (
              <g
                key={it.id}
                transform={`translate(${it.x} ${it.y})`}
                opacity={tool === 'decor' || tool === 'delete' ? 1 : 0.55}
                className={tool === 'decor' || tool === 'delete' ? 'cursor-pointer' : ''}
                onPointerDown={(e) => {
                  if (tool === 'delete') {
                    e.stopPropagation()
                    deleteDecor(it.id)
                    return
                  }
                  if (tool !== 'decor') return
                  e.stopPropagation()
                  setSelectedDecorId(it.id)
                  pushHist(def)
                  dragRef.current = { kind: 'decor', id: it.id }
                }}
              >
                <rect
                  x={-0.22}
                  y={-0.22}
                  width={0.44}
                  height={0.44}
                  transform="rotate(45)"
                  fill="#86efac"
                  stroke={isSel ? '#ffffff' : '#14532d'}
                  strokeWidth={isSel ? 0.08 : 0.04}
                />
                <text y={0.12} textAnchor="middle" fontSize={0.3} style={{ pointerEvents: 'none' }}>
                  🌲
                </text>
              </g>
            )
          })}

          {/* cases */}
          {def.seeds.map((s) => {
            const isSel = s.id === selectedId
            const isSource = s.id === linkSource
            return (
              <g
                key={s.id}
                transform={`translate(${s.x} ${s.y})`}
                onPointerDown={(e) => onSpacePointerDown(e, s.id)}
                className="cursor-pointer"
              >
                {s.starSpot && (
                  <circle r={0.42} fill="none" stroke="#f6c244" strokeWidth={0.07} opacity={0.9} />
                )}
                <circle
                  r={0.3}
                  fill={TYPE_COLORS[s.type]}
                  stroke={isSel ? '#ffffff' : isSource ? '#f6c244' : '#00000055'}
                  strokeWidth={isSel || isSource ? 0.09 : 0.04}
                />
                {s.type === 'EVENT' && (
                  <text
                    y={0.13}
                    textAnchor="middle"
                    fontSize={0.36}
                    fontWeight={900}
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    !
                  </text>
                )}
                {(s.hasBoo ||
                  s.hasMole ||
                  s.hasShop ||
                  s.wall ||
                  s.gate ||
                  s.type === 'EVENT') && (
                  <text
                    y={-0.42}
                    textAnchor="middle"
                    fontSize={0.4}
                    style={{ pointerEvents: 'none' }}
                  >
                    {s.hasBoo
                      ? '👻'
                      : s.hasMole
                        ? '🦫'
                        : s.hasShop
                          ? '🛒'
                          : s.wall
                            ? '🧱'
                            : s.gate
                              ? '🚪'
                              : s.event === 'PIT'
                                ? '🕳️'
                                : s.event === 'SIGNPOST'
                                  ? '🪧'
                                  : s.type === 'EVENT'
                                    ? '🌳'
                                    : ''}
                  </text>
                )}
                {vb.w < 16 && (
                  <text
                    y={0.62}
                    textAnchor="middle"
                    fontSize={0.22}
                    fill="#ffffff88"
                    style={{ pointerEvents: 'none' }}
                  >
                    {s.id}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* bandeau d'état */}
        {applied && (
          <div className="bg-night-900/90 text-gold-300 absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-extrabold shadow-lg">
            {applied}
          </div>
        )}
        <p className="text-cream/45 absolute bottom-2 left-3 text-xs font-bold">
          molette = zoom · glisser le fond = déplacer la vue · Ctrl+Z = annuler
        </p>
      </div>

      {/* ----- Panneau latéral ----- */}
      <aside className="bg-night-900/90 flex w-80 shrink-0 flex-col gap-3 overflow-y-auto p-4">
        <div>
          <label className="text-cream/50 text-[11px] font-extrabold uppercase">Nom de la map</label>
          <input
            value={def.name}
            onChange={(e) => apply((d) => void (d.name = e.target.value), false)}
            className="bg-night-800 mt-1 w-full rounded-lg px-3 py-1.5 text-sm font-extrabold outline-none"
          />
          <p className="text-cream/45 mt-1 text-[11px] font-bold">
            Map active : {getActiveBoardDef().name}
            {customActive ? ' (custom)' : ''} · {def.seeds.length} cases en édition
          </p>
        </div>

        {/* Outils */}
        <div className="grid grid-cols-5 gap-1.5">
          {(
            [
              ['select', '🖐️', 'Sélection / déplacer'],
              ['add', '➕', 'Ajouter une case'],
              ['link', '🔗', 'Lier (clic A puis B : sens unique → double → rien)'],
              ['decor', '🌳', 'Poser du décor 3D (banque de modèles)'],
              ['delete', '🗑️', 'Supprimer'],
            ] as [Tool, string, string][]
          ).map(([t, icon, tip]) => (
            <button
              key={t}
              title={tip}
              onClick={() => {
                setTool(t)
                setLinkSource(null)
              }}
              className={`rounded-lg py-2 text-xl ${tool === t ? 'bg-gold-400 text-night-950' : 'bg-night-800 hover:bg-night-700'}`}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Palette (mode ajout) */}
        {tool === 'add' && (
          <div className="bg-night-800/60 rounded-xl p-2.5">
            <p className="text-cream/50 mb-1.5 text-[11px] font-extrabold uppercase">Type à poser</p>
            <div className="flex flex-wrap gap-1">
              {SPACE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setPaletteType(t)}
                  className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${paletteType === t ? 'ring-2 ring-cream' : ''}`}
                  style={{ backgroundColor: TYPE_COLORS[t], color: '#10130c' }}
                >
                  {SPACE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {tool === 'link' && (
          <p className="text-cream/60 bg-night-800/60 rounded-xl p-2.5 text-xs font-bold">
            🔗 Clique une case source puis une cible : 1ᵉʳ clic = sens unique →, 2ᵉ = double sens ↔,
            3ᵉ = supprime. Clique aussi directement un lien pour le faire évoluer.
            {linkSource && (
              <span className="text-gold-300 block">Source : {linkSource}</span>
            )}
          </p>
        )}

        {/* Décor 3D (banque KayKit & co) */}
        {tool === 'decor' && (
          <div className="bg-night-800/60 flex flex-col gap-2 rounded-xl p-2.5">
            <p className="text-cream/50 text-[11px] font-extrabold uppercase">
              Décor à poser (clic sur la map)
            </p>
            {decorBank.length === 0 ? (
              <p className="text-cream/60 text-xs font-bold">
                Banque vide : liste tes .glb dans public/models/manifest.json (les 47 modèles
                KayKit convertis y sont déjà).
              </p>
            ) : (
              <select
                value={decorFile ?? ''}
                onChange={(e) => setDecorFile(e.target.value)}
                className="bg-night-900 rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
              >
                {decorBank.map((b) => (
                  <option key={b.file} value={b.file}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            {selectedDecor && (
              <div className="flex flex-col gap-1.5">
                <p className="text-gold-300 text-sm font-extrabold">
                  {decorBank.find((b) => b.file === selectedDecor.file)?.name ?? selectedDecor.file}{' '}
                  <span className="text-cream/45 font-bold">({selectedDecor.id})</span>
                </p>
                <label className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-16">Taille</span>
                  <input
                    type="range"
                    min={0.3}
                    max={6}
                    step={0.1}
                    value={selectedDecor.scale}
                    onChange={(e) =>
                      patchDecor(selectedDecor.id, { scale: Number(e.target.value) }, false)
                    }
                    className="flex-1"
                  />
                  <span className="w-9 text-right">{selectedDecor.scale.toFixed(1)}</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-16">Rotation</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={selectedDecor.rotY}
                    onChange={(e) =>
                      patchDecor(selectedDecor.id, { rotY: Number(e.target.value) }, false)
                    }
                    className="flex-1"
                  />
                  <span className="w-9 text-right">{selectedDecor.rotY}°</span>
                </label>
                <button
                  onClick={() => deleteDecor(selectedDecor.id)}
                  className="rounded-lg bg-red-900/50 px-3 py-1.5 text-sm font-extrabold hover:bg-red-900/70"
                >
                  🗑️ Supprimer ce décor
                </button>
              </div>
            )}
          </div>
        )}

        {/* Édition de la case sélectionnée */}
        {selected && (
          <div className="bg-night-800/60 flex flex-col gap-2 rounded-xl p-2.5">
            <p className="text-gold-300 text-sm font-extrabold">
              Case {selected.id}{' '}
              <span className="text-cream/45 font-bold">
                ({selected.x.toFixed(1)}, {selected.y.toFixed(1)})
              </span>
            </p>
            <select
              value={selected.type}
              onChange={(e) =>
                apply((d) => {
                  const s = d.seeds.find((x) => x.id === selected.id)
                  if (!s) return
                  s.type = e.target.value as SpaceType
                  if (s.type !== 'EVENT') delete s.event
                })
              }
              className="bg-night-900 rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
            >
              {SPACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SPACE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {selected.type === 'EVENT' && (
              <select
                value={selected.event ?? 'SIGNPOST'}
                onChange={(e) =>
                  apply((d) => {
                    const s = d.seeds.find((x) => x.id === selected.id)
                    if (s) s.event = e.target.value as BoardEventKind
                  })
                }
                className="bg-night-900 rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
              >
                {EVENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {EVENT_LABELS[k]}
                  </option>
                ))}
              </select>
            )}
            {selected.type === 'EVENT' && (selected.event ?? 'SIGNPOST') === 'SIGNPOST' && (
              <div className="bg-night-900/70 rounded-lg p-2 text-xs font-bold">
                <p className="text-cream/60">
                  🪧 Un panneau DIRIGE le carrefour vers lequel pointe son{' '}
                  <span className="text-gold-300">premier lien sortant</span> :
                </p>
                {selected.next.length === 0 ? (
                  <p className="mt-1 text-red-300">✗ aucun lien sortant — relie-le au carrefour.</p>
                ) : (
                  <>
                    <p className="mt-1">
                      Gouverne : <span className="text-gold-300">{selected.next[0]}</span>{' '}
                      {(byId.get(selected.next[0])?.next.length ?? 0) >= 2 ? (
                        <span className="text-emerald-400">✓ carrefour</span>
                      ) : (
                        <span className="text-amber-300">⚠ pas un carrefour (panneau inactif)</span>
                      )}
                    </p>
                    {selected.next.length > 1 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-cream/50">Cible :</span>
                        {selected.next.map((n) => (
                          <button
                            key={n}
                            onClick={() =>
                              apply((d) => {
                                const sd = d.seeds.find((x) => x.id === selected.id)
                                if (sd) sd.next = [n, ...sd.next.filter((x) => x !== n)]
                              })
                            }
                            className={`rounded px-1.5 py-0.5 ${
                              selected.next[0] === n
                                ? 'bg-gold-400 text-night-950'
                                : 'bg-night-800 hover:bg-night-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {(
              [
                ['starSpot', '⭐ Spot Étoile'],
                ['hasBoo', '👻 Boo'],
                ['hasMole', '🦫 Topi Taupe'],
                ['hasShop', '🛒 Boutique'],
                ['wall', '🧱 Mur'],
                ['gate', '🚪 Portail à péage'],
              ] as const
            ).map(([flag, label]) => (
              <label key={flag} className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={Boolean(selected[flag])}
                  onChange={(e) =>
                    apply((d) => {
                      const s = d.seeds.find((x) => x.id === selected.id)
                      if (!s) return
                      if (e.target.checked) (s as Record<string, unknown>)[flag] = true
                      else delete (s as Record<string, unknown>)[flag]
                    })
                  }
                />
                {label}
              </label>
            ))}
            <button
              onClick={() => deleteSpace(selected.id)}
              className="rounded-lg bg-red-900/50 px-3 py-1.5 text-sm font-extrabold hover:bg-red-900/70"
            >
              🗑️ Supprimer cette case
            </button>
          </div>
        )}

        {/* Image de fond */}
        <div className="bg-night-800/60 rounded-xl p-2.5">
          <label className="flex items-center gap-2 text-sm font-extrabold">
            <input
              type="checkbox"
              checked={img.visible}
              onChange={(e) => setImg((i) => ({ ...i, visible: e.target.checked }))}
            />
            🗺️ Image source en fond
          </label>
          {img.visible && (
            <>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={img.opacity}
                onChange={(e) => setImg((i) => ({ ...i, opacity: Number(e.target.value) }))}
                className="mt-2 w-full"
              />
              <details className="text-cream/60 mt-1 text-xs font-bold">
                <summary className="cursor-pointer">Calage de l'image</summary>
                <div className="mt-1.5 flex flex-col gap-1">
                  {(
                    [
                      ['scale', 0.5, 2, 0.01, 'Échelle'],
                      ['dx', -8, 8, 0.1, 'Décalage X'],
                      ['dy', -8, 8, 0.1, 'Décalage Y'],
                    ] as const
                  ).map(([k, min, max, step, label]) => (
                    <label key={k} className="flex items-center gap-2">
                      <span className="w-20">{label}</span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={img[k]}
                        onChange={(e) => setImg((i) => ({ ...i, [k]: Number(e.target.value) }))}
                        className="flex-1"
                      />
                    </label>
                  ))}
                </div>
              </details>
            </>
          )}
        </div>

        {/* Validation */}
        <div className="bg-night-800/60 rounded-xl p-2.5">
          <p className="text-cream/50 text-[11px] font-extrabold uppercase">Validation</p>
          {validation.errors.length === 0 ? (
            <p className="mt-1 text-sm font-extrabold text-emerald-400">✓ Map jouable</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-0.5 text-xs font-bold text-red-300">
              {validation.errors.slice(0, 8).map((e, i) => (
                <li key={i}>✗ {e}</li>
              ))}
              {validation.errors.length > 8 && <li>… +{validation.errors.length - 8}</li>}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <ul className="text-gold-300/80 mt-1 flex flex-col gap-0.5 text-xs font-bold">
              {validation.warnings.slice(0, 5).map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <button
          disabled={validation.errors.length > 0}
          onClick={playThisMap}
          className="font-display from-gold-400 to-gold-500 text-night-950 rounded-xl bg-gradient-to-b px-4 py-2.5 text-lg tracking-wide shadow-[0_4px_0_rgba(0,0,0,0.35)] disabled:opacity-35"
        >
          ▶ JOUER CETTE MAP
        </button>
        <div className="grid grid-cols-2 gap-1.5 text-sm font-extrabold">
          <button onClick={undo} className="bg-night-800 hover:bg-night-700 rounded-lg px-2 py-1.5">
            ↩️ Annuler
          </button>
          <button onClick={resetWoody} className="bg-night-800 hover:bg-night-700 rounded-lg px-2 py-1.5">
            ↺ Woody Woods
          </button>
          <button onClick={exportJson} className="bg-night-800 hover:bg-night-700 rounded-lg px-2 py-1.5">
            ⬇️ Exporter
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-night-800 hover:bg-night-700 rounded-lg px-2 py-1.5"
          >
            ⬆️ Importer
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importJson(f)
            e.target.value = ''
          }}
        />
      </aside>
    </div>
  )
}
