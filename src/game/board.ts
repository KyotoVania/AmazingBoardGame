// ============================================================
// board.ts — Le plateau sous forme de graphe INJECTABLE.
// Le plateau par défaut est Woody Woods (~80 cases, retracé depuis
// Docs/imgMap.png) mais tout est reconstruit depuis un BoardDef :
// l'éditeur de map (Atelier) peut injecter un plateau custom via
// setActiveBoard(). Les exports gardent les MÊMES noms qu'avant —
// bindings vivants + mutation en place : aucun importeur ne change.
//
// Woody Woods par défaut :
//   - boucle extérieure complète (bas → ouest → nord → est)
//   - bande centrale horizontale ouest → est
//   - connecteur ouest (avec LE TROU) et connecteur centre
//   - boucle intérieure sud-est (avec LE MUR sur le raccourci)
//   - mini-boucle près du départ
// Embranchements : 3 forks à PANNEAUX (direction dictée, règles
// réelles) + forks LIBRES (choix) aux jonctions bidirectionnelles.
// ============================================================

import type { BoardSpace } from './types'

/** Une case telle qu'éditée : `next` = arêtes du sens de circulation. */
export type BoardSeed = Omit<BoardSpace, 'nextSpaces'> & { next: string[] }

/** Élément de décor posé librement sur la map (modèle de la banque). */
export interface DecorItem {
  id: string
  /** Chemin BRUT du .glb tel que listé dans public/models/manifest.json. */
  file: string
  x: number
  y: number
  /** Hauteur monde approximative du modèle (FittedModel). */
  scale: number
  /** Rotation autour de Y, en degrés. */
  rotY: number
}

/** Un plateau complet, sérialisable (éditeur de map / export JSON). */
export interface BoardDef {
  name: string
  /** Échelle appliquée aux coordonnées des seeds pour le monde 3D. */
  scale: number
  seeds: BoardSeed[]
  /** Tronçons praticables dans les deux sens : l'arête inverse est ajoutée. */
  twoWayPairs: [string, string][]
  /** Décor 3D purement cosmétique (assets KayKit & co). */
  decor?: DecorItem[]
}

// ---------- Woody Woods (plateau par défaut) ----------

const SEEDS: BoardSeed[] = [
  // ----- Boucle extérieure : bord bas, vers l'ouest -----
  { id: 'o01', type: 'START', x: 8.0, y: 6.3, next: ['o02'] },
  { id: 'o02', type: 'BLUE', x: 6.9, y: 6.5, next: ['o03'] },
  // Fork LIBRE : mini-boucle du départ (raccourci vers le spot étoile sud-est)
  { id: 'o03', type: 'WAYPOINT', x: 5.8, y: 6.6, next: ['o04', 'q01'], branchLabels: ['Grand tour du plateau', 'Mini-boucle (spot étoile) 🚪'] },
  { id: 'o04', type: 'BLUE', x: 4.7, y: 6.6, next: ['o05'] },
  { id: 'o05', type: 'ITEM', x: 3.6, y: 6.5, next: ['o06'] },
  { id: 'o06', type: 'SIP_PLUS', x: 2.5, y: 6.4, next: ['o07'] },
  { id: 'o07', type: 'BLUE', x: 1.4, y: 6.4, next: ['o08'] },
  { id: 'o08', type: 'EVENT', event: 'SIGNPOST', x: 0.3, y: 6.4, next: ['o09'] },
  // Fork à PANNEAU n°1 : continuer à l'ouest ou monter au centre
  { id: 'o09', type: 'WAYPOINT', x: -0.8, y: 6.3, next: ['o10', 'c01'], branchLabels: ['Route de l’ouest (arbre généreux)', 'Vers le centre (LE TROU)'] },
  { id: 'o10', type: 'RED', x: -1.9, y: 6.2, next: ['o11'] },
  { id: 'o11', type: 'BLUE', x: -3.0, y: 6.0, next: ['o12'] },
  { id: 'o12', type: 'BLUE', x: -4.1, y: 5.6, next: ['o13'], starSpot: true },
  { id: 'o13', type: 'EVENT', event: 'TREE_GOOD', x: -5.1, y: 5.0, next: ['o14'] },
  { id: 'o14', type: 'EVENT', event: 'TREE_GOOD', x: -5.9, y: 4.2, next: ['o15'] },
  { id: 'o15', type: 'EVENT', event: 'TREE_GOOD', x: -6.5, y: 3.3, next: ['o16'] },
  { id: 'o16', type: 'SIP_MINUS', x: -6.9, y: 2.3, next: ['o17'] },
  { id: 'o17', type: 'RED', x: -7.2, y: 1.3, next: ['o18'] },
  { id: 'o18', type: 'EVENT', event: 'SIGNPOST', x: -7.4, y: 0.2, next: ['o19'] },
  // Fork à PANNEAU n°2 : continuer au nord ou bifurquer dans la bande centrale
  { id: 'o19', type: 'WAYPOINT', x: -7.4, y: -0.9, next: ['o20', 'm01'], branchLabels: ['Route du nord (arbre maudit)', 'Bande centrale'] },
  { id: 'o20', type: 'ITEM', x: -7.2, y: -2.0, next: ['o21'] },
  { id: 'o21', type: 'LUCKY', x: -7.0, y: -3.0, next: ['o22'] },
  { id: 'o22', type: 'EVENT', event: 'TREE_BAD', x: -6.6, y: -4.0, next: ['o23'] },
  { id: 'o23', type: 'EVENT', event: 'TREE_BAD', x: -6.0, y: -5.0, next: ['o24'] },
  { id: 'o24', type: 'EVENT', event: 'TREE_BAD', x: -5.0, y: -5.7, next: ['o25'] },
  // Topi Taupe (doc : en haut du plateau, réoriente les panneaux contre des pièces)
  { id: 'o25', type: 'BLUE', x: -3.9, y: -6.1, next: ['o26'], hasMole: true },
  { id: 'o26', type: 'RED', x: -2.8, y: -6.3, next: ['o27'] },
  { id: 'o27', type: 'ITEM', x: -1.7, y: -6.4, next: ['o28'] },
  { id: 'o28', type: 'BLUE', x: -0.6, y: -6.4, next: ['o29'] },
  { id: 'o29', type: 'VS', x: 0.5, y: -6.3, next: ['o30'] },
  { id: 'o30', type: 'BLUE', x: 1.6, y: -6.2, next: ['o31'], hasBoo: true },
  { id: 'o31', type: 'EVENT', event: 'SIGNPOST', x: 2.7, y: -6.1, next: ['o32'] },
  // Fork à PANNEAU n°3 : continuer à l'est ou plonger vers la bande centrale
  { id: 'o32', type: 'WAYPOINT', x: 3.8, y: -6.0, next: ['o33', 'c11'], branchLabels: ['Route de l’est (spot étoile)', 'Plongée vers le centre'] },
  { id: 'o33', type: 'ITEM', x: 4.9, y: -5.8, next: ['o34'] },
  { id: 'o34', type: 'BLUE', x: 6.0, y: -5.6, next: ['o35'] },
  { id: 'o35', type: 'ALLY', x: 7.0, y: -5.2, next: ['o36'] },
  { id: 'o36', type: 'RED', x: 7.8, y: -4.5, next: ['o37'] },
  { id: 'o37', type: 'BLUE', x: 8.3, y: -3.6, next: ['o38'] },
  { id: 'o38', type: 'BLUE', x: 8.6, y: -2.6, next: ['o39'], starSpot: true },
  { id: 'o39', type: 'LUCKY', x: 8.8, y: -1.6, next: ['o40'] },
  { id: 'o40', type: 'BLUE', x: 8.9, y: -0.6, next: ['o41'] },
  { id: 'o41', type: 'ITEM', x: 8.9, y: 0.4, next: ['o42'] },
  { id: 'o42', type: 'BLUE', x: 8.8, y: 1.4, next: ['o43'] },
  { id: 'o43', type: 'BAD_LUCK', x: 8.7, y: 2.4, next: ['o44'] },
  // Boutique de Flutter (doc SMP : achat au passage, comme l'Étoile/Boo)
  { id: 'o44', type: 'BLUE', x: 8.6, y: 3.4, next: ['o45'], hasShop: true },
  { id: 'o45', type: 'BLUE', x: 8.4, y: 4.4, next: ['o46'] },
  { id: 'o46', type: 'SIP_PLUS', x: 8.2, y: 5.4, next: ['o01'] },

  // ----- Bande centrale, ouest → est -----
  { id: 'm01', type: 'BLUE', x: -6.3, y: -1.0, next: ['m02'] },
  { id: 'm02', type: 'BLUE', x: -5.2, y: -1.0, next: ['m03'], starSpot: true },
  { id: 'm03', type: 'SIP_MINUS', x: -4.1, y: -1.0, next: ['m04'] },
  // Banque Koopa : péage de 5 au passage, jackpot de la cagnotte à l'arrêt pile
  { id: 'm04', type: 'BANK', x: -3.0, y: -1.0, next: ['m05'] },
  { id: 'm05', type: 'BLUE', x: -1.9, y: -1.0, next: ['m06'] },
  { id: 'm06', type: 'VS', x: -0.8, y: -1.0, next: ['m07'] },
  { id: 'm07', type: 'BLUE', x: 0.3, y: -1.0, next: ['m08'] },
  { id: 'm08', type: 'BLUE', x: 1.4, y: -0.9, next: ['m09'] },
  // Fork LIBRE : raccourci par la boucle intérieure (gardé par LE MUR)
  { id: 'm09', type: 'WAYPOINT', x: 2.5, y: -0.9, next: ['m10', 'l01'], branchLabels: ['Route principale', 'Raccourci muré 🧱'] },
  { id: 'm10', type: 'RED', x: 3.6, y: -0.8, next: ['m11'] },
  { id: 'm11', type: 'BLUE', x: 4.7, y: -0.7, next: ['m12'] },
  { id: 'm12', type: 'VS', x: 5.8, y: -0.6, next: ['m13'] },
  { id: 'm13', type: 'BLUE', x: 6.9, y: -0.4, next: ['m14'] },
  { id: 'm14', type: 'BLUE', x: 7.9, y: 0.0, next: ['o41'] },

  // ----- Connecteur ouest (fork panneau n°1 → bande centrale) -----
  { id: 'c01', type: 'BLUE', x: -0.9, y: 5.2, next: ['c02'] },
  { id: 'c02', type: 'RED', x: -1.0, y: 4.1, next: ['c03'] },
  { id: 'c03', type: 'BLUE', x: -1.1, y: 3.0, next: ['c04'] },
  // LE TROU : il faut un lancer suffisant pour en sortir
  { id: 'c04', type: 'EVENT', event: 'PIT', x: -1.2, y: 1.9, next: ['c05'] },
  // Inversion ⇄ : qui tombe ici repart à contresens du plateau
  { id: 'c05', type: 'REVERSE', x: -1.3, y: 0.9, next: ['c06'] },
  { id: 'c06', type: 'BLUE', x: -1.6, y: -0.1, next: ['m05'] },

  // ----- Connecteur centre (fork panneau n°3 → bande centrale) -----
  { id: 'c11', type: 'BLUE', x: 3.6, y: -4.9, next: ['c12'] },
  { id: 'c12', type: 'RED', x: 3.4, y: -3.8, next: ['c13'] },
  { id: 'c13', type: 'SIP_MINUS', x: 3.2, y: -2.8, next: ['c14'] },
  { id: 'c14', type: 'BLUE', x: 2.4, y: -2.0, next: ['c15'] },
  { id: 'c15', type: 'BLUE', x: 1.2, y: -1.6, next: ['m07'] },

  // ----- Boucle intérieure sud-est (raccourci muré) -----
  { id: 'l01', type: 'BLUE', x: 2.6, y: 0.2, next: ['l02'] },
  // LE MUR : casse à 6, la valeur requise baisse de 1 à chaque échec
  { id: 'l02', type: 'BLUE', x: 2.7, y: 1.3, next: ['l03'], wall: true },
  { id: 'l03', type: 'ITEM', x: 3.3, y: 2.2, next: ['l04'] },
  { id: 'l04', type: 'BLUE', x: 4.1, y: 3.0, next: ['l05'] },
  { id: 'l05', type: 'LUCKY', x: 4.9, y: 3.8, next: ['l06'] },
  { id: 'l06', type: 'BLUE', x: 5.8, y: 4.4, next: ['l07'] },
  { id: 'l07', type: 'SIP_PLUS', x: 6.8, y: 4.7, next: ['l08'] },
  { id: 'l08', type: 'BLUE', x: 7.7, y: 4.6, next: ['o45'] },

  // ----- Mini-boucle du départ -----
  // Portail à péage à l'entrée de la mini-boucle (spot étoile express)
  { id: 'q01', type: 'ALLY', x: 5.5, y: 5.7, next: ['q02'], gate: true },
  { id: 'q02', type: 'BLUE', x: 4.9, y: 4.8, next: ['l06'], starSpot: true },
]

/**
 * Tronçons praticables DANS LES DEUX SENS : les connecteurs et boucles
 * internes. Aux carrefours (jonctions avec la route principale), le
 * joueur choisit donc librement sa direction — interdiction du
 * demi-tour immédiat gérée par le moteur (movement.cameFrom).
 */
const TWO_WAY_CHAINS: string[][] = [
  ['o09', 'c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'm05'], // connecteur ouest (LE TROU)
  ['o32', 'c11', 'c12', 'c13', 'c14', 'c15', 'm07'], // connecteur centre
  ['o41', 'm14', 'm13', 'm12', 'm11', 'm10', 'm09'], // bande centrale est
  ['o45', 'l08', 'l07', 'l06', 'l05', 'l04', 'l03', 'l02', 'l01', 'm09'], // boucle muraille
]

/** Le plateau par défaut, sérialisable comme n'importe quel plateau custom. */
export const WOODY_WOODS_DEF: BoardDef = {
  name: 'Woody Woods',
  scale: 1.6,
  seeds: SEEDS,
  twoWayPairs: TWO_WAY_CHAINS.flatMap((chain) =>
    chain.slice(0, -1).map((a, i) => [a, chain[i + 1]] as [string, string]),
  ),
}

// ---------- Exports vivants (reconstruits par setActiveBoard) ----------
// Les Records/tableaux sont mutés EN PLACE et les scalaires sont des
// `let` (bindings ES vivants) : les importeurs voient toujours le
// plateau actif sans changer une ligne.

export let BOARD_SCALE = WOODY_WOODS_DEF.scale

export const BOARD: Record<string, BoardSpace> = {}

export const SPACE_IDS: string[] = []

/** Graphe inversé : pour le recul de l'arbre maudit. */
export const PREV: Record<string, string[]> = {}

/** Emplacements candidats de l'Étoile (points jaunes de la map). */
export const STAR_SPOTS: string[] = []

/**
 * Les vraies cases de CHOIX : depuis au moins une case d'arrivée, il
 * reste ≥ 2 directions une fois le demi-tour exclu.
 */
export const FORK_IDS: string[] = []

/**
 * Forks gouvernés par un PANNEAU (la case EVENT/SIGNPOST juste avant) :
 * la direction y est dictée par le panneau — règles réelles de Woody Woods.
 */
export const SIGNPOST_FORK_IDS: string[] = []

/** Cases portant un mur destructible. */
export const WALL_SPACE_IDS: string[] = []

/** Les cases événement devant les arbres. */
export const TREE_GOOD_IDS: string[] = []
export const TREE_BAD_IDS: string[] = []

/** Cases occupées par un Topi Taupe (réorientation des panneaux). */
export const MOLE_SPACE_IDS: string[] = []

/** Cases des boutiques de Flutter (il peut y en avoir plusieurs). */
export const SHOP_SPACE_IDS: string[] = []

/** Cases Banque Koopa. */
export const BANK_SPACE_IDS: string[] = []

export let START_SPACE_ID = 'o01'

let activeDef: BoardDef = WOODY_WOODS_DEF

/** Le BoardDef actuellement joué (défaut : Woody Woods). */
export function getActiveBoardDef(): BoardDef {
  return activeDef
}

/** Reconstruit tout le plateau actif depuis un BoardDef (validé en amont). */
export function setActiveBoard(def: BoardDef): void {
  activeDef = def
  BOARD_SCALE = def.scale

  for (const key of Object.keys(BOARD)) delete BOARD[key]
  for (const seed of def.seeds) {
    const { next, ...rest } = seed
    BOARD[seed.id] = {
      ...rest,
      x: seed.x * def.scale,
      y: seed.y * def.scale,
      nextSpaces: [...next],
    }
  }
  // Arêtes inverses des tronçons bidirectionnels
  for (const [a, b] of def.twoWayPairs) {
    const sa = BOARD[a]
    const sb = BOARD[b]
    if (!sa || !sb) continue
    if (!sa.nextSpaces.includes(b)) sa.nextSpaces.push(b)
    if (!sb.nextSpaces.includes(a)) sb.nextSpaces.push(a)
  }

  SPACE_IDS.splice(0, SPACE_IDS.length, ...def.seeds.map((s) => s.id))

  for (const key of Object.keys(PREV)) delete PREV[key]
  for (const id of SPACE_IDS) PREV[id] = []
  for (const space of Object.values(BOARD)) {
    for (const next of space.nextSpaces) PREV[next]?.push(space.id)
  }

  STAR_SPOTS.splice(0, STAR_SPOTS.length, ...def.seeds.filter((s) => s.starSpot).map((s) => s.id))

  const forks = Object.values(BOARD)
    .filter((space) => {
      if (space.nextSpaces.length < 2) return false
      return PREV[space.id].some(
        (from) => space.nextSpaces.filter((n) => n !== from).length >= 2,
      )
    })
    .map((space) => space.id)
  FORK_IDS.splice(0, FORK_IDS.length, ...forks)

  SIGNPOST_FORK_IDS.splice(
    0,
    SIGNPOST_FORK_IDS.length,
    ...def.seeds.filter((s) => s.event === 'SIGNPOST').map((s) => s.next[0]),
  )

  WALL_SPACE_IDS.splice(
    0,
    WALL_SPACE_IDS.length,
    ...def.seeds.filter((s) => s.wall).map((s) => s.id),
  )
  TREE_GOOD_IDS.splice(
    0,
    TREE_GOOD_IDS.length,
    ...def.seeds.filter((s) => s.event === 'TREE_GOOD').map((s) => s.id),
  )
  TREE_BAD_IDS.splice(
    0,
    TREE_BAD_IDS.length,
    ...def.seeds.filter((s) => s.event === 'TREE_BAD').map((s) => s.id),
  )

  MOLE_SPACE_IDS.splice(0, MOLE_SPACE_IDS.length, ...def.seeds.filter((s) => s.hasMole).map((s) => s.id))
  SHOP_SPACE_IDS.splice(0, SHOP_SPACE_IDS.length, ...def.seeds.filter((s) => s.hasShop).map((s) => s.id))
  BANK_SPACE_IDS.splice(0, BANK_SPACE_IDS.length, ...def.seeds.filter((s) => s.type === 'BANK').map((s) => s.id))
  START_SPACE_ID = def.seeds.find((s) => s.type === 'START')?.id ?? def.seeds[0]?.id ?? 'o01'
}

setActiveBoard(WOODY_WOODS_DEF)

// ---------- Validation d'un BoardDef (éditeur / import JSON) ----------

export interface BoardValidation {
  /** Bloquants : le moteur planterait ou la partie serait injouable. */
  errors: string[]
  /** Non bloquants : map jouable mais étrange. */
  warnings: string[]
}

export function validateBoardDef(def: BoardDef): BoardValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const ids = new Set<string>()

  if (!def.seeds || def.seeds.length < 10) errors.push('Il faut au moins 10 cases.')
  for (const s of def.seeds ?? []) {
    if (!s.id?.trim()) errors.push('Une case a un id vide.')
    else if (ids.has(s.id)) errors.push(`Id de case dupliqué : ${s.id}`)
    ids.add(s.id)
  }

  // Graphe effectif (next + tronçons deux sens), sans toucher au plateau actif
  const nexts = new Map<string, Set<string>>()
  for (const s of def.seeds) nexts.set(s.id, new Set(s.next))
  for (const [a, b] of def.twoWayPairs ?? []) {
    if (!ids.has(a) || !ids.has(b)) {
      errors.push(`Tronçon deux-sens vers une case inconnue : ${a} ↔ ${b}`)
      continue
    }
    nexts.get(a)!.add(b)
    nexts.get(b)!.add(a)
  }
  for (const s of def.seeds) {
    for (const n of s.next) {
      if (!ids.has(n)) errors.push(`${s.id} pointe vers une case inconnue : ${n}`)
      if (n === s.id) errors.push(`${s.id} boucle sur elle-même.`)
    }
  }

  const starts = def.seeds.filter((s) => s.type === 'START')
  if (starts.length !== 1)
    errors.push(`Il faut exactement 1 case Départ (trouvé : ${starts.length}).`)

  for (const s of def.seeds) {
    if ((nexts.get(s.id)?.size ?? 0) === 0) errors.push(`${s.id} est une impasse (aucune sortie).`)
  }

  // Atteignabilité depuis le départ + entrées
  if (starts.length === 1 && errors.length === 0) {
    const seen = new Set<string>([starts[0].id])
    const queue = [starts[0].id]
    while (queue.length > 0) {
      const id = queue.pop()!
      for (const n of nexts.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n)
          queue.push(n)
        }
      }
    }
    for (const s of def.seeds) {
      if (!seen.has(s.id)) errors.push(`${s.id} est inatteignable depuis le départ.`)
    }
    const hasIncoming = new Set<string>()
    for (const [id, set] of nexts) for (const n of set) if (n !== id) hasIncoming.add(n)
    for (const s of def.seeds) {
      if (!hasIncoming.has(s.id) && s.type !== 'START')
        warnings.push(`${s.id} n'a aucune entrée (impossible d'y passer).`)
    }
  }

  const starSpots = def.seeds.filter((s) => s.starSpot)
  if (starSpots.length < 2)
    errors.push(
      `Il faut au moins 2 emplacements d'Étoile pour qu'elle déménage (trouvé : ${starSpots.length}).`,
    )

  const blues = def.seeds.filter((s) => s.type === 'BLUE')
  if (blues.length < 5)
    errors.push(`Il faut au moins 5 cases bleues (malédictions de Kamek) — trouvé : ${blues.length}.`)

  for (const s of def.seeds) {
    if (s.event === 'SIGNPOST') {
      const fork = s.next[0]
      const exits = nexts.get(fork)?.size ?? 0
      if (exits < 2)
        warnings.push(`Le panneau ${s.id} précède ${fork} qui n'est pas un embranchement.`)
    }
    if (s.type === 'EVENT' && !s.event) warnings.push(`${s.id} est une case EVENT sans événement.`)
  }

  // Boucle de cases vides : un déplacement gratuit n'y finirait jamais
  // (cycle dans le sous-graphe WAYPOINT, demi-tour immédiat exclu).
  const wpIds = new Set(def.seeds.filter((sd) => sd.type === 'WAYPOINT').map((sd) => sd.id))
  if (wpIds.size > 0) {
    const color = new Map<string, number>()
    const dfs = (id: string, from: string | null): boolean => {
      color.set(id, 1)
      let skippedParent = false
      for (const n of nexts.get(id) ?? []) {
        if (!wpIds.has(n)) continue
        if (n === from && !skippedParent) {
          skippedParent = true
          continue
        }
        const c = color.get(n) ?? 0
        if (c === 1) return true
        if (c === 0 && dfs(n, id)) return true
      }
      color.set(id, 2)
      return false
    }
    for (const id of wpIds) {
      if ((color.get(id) ?? 0) === 0 && dfs(id, null)) {
        warnings.push(
          'Boucle de cases vides détectée : les pions risquent d’y tourner (garde-fou moteur à 150 sauts).',
        )
        break
      }
    }
  }
  for (const sd of def.seeds) {
    if (sd.gate && sd.type === 'START') warnings.push('Portail à péage sur la case Départ.')
    if (sd.type === 'WAYPOINT' && sd.wall)
      warnings.push(`${sd.id} : mur sur une case de passage libre (on ne peut pas s'y arrêter).`)
  }

  if (!def.seeds.some((s) => s.type === 'ITEM')) warnings.push('Aucune case Item sur la map.')

  return { errors, warnings }
}

// ---------- Helpers ----------

/**
 * Distance en cases (BFS sur le graphe, sens de circulation respecté).
 * Comme sur la vraie map Woody Woods : on IGNORE la direction des
 * panneaux — c'est « le plus court si les flèches coopèrent ».
 * -1 si inatteignable.
 */
export function distanceBetween(fromId: string, toId: string): number {
  if (fromId === toId) return 0
  // BFS 0-1 : traverser une case vide (WAYPOINT) ne coûte AUCUN pas
  const dist = new Map<string, number>([[fromId, 0]])
  const deque: string[] = [fromId]
  let guard = 0
  while (deque.length > 0 && guard++ < 5000) {
    const id = deque.shift()!
    const d = dist.get(id)!
    for (const n of BOARD[id]?.nextSpaces ?? []) {
      const w = BOARD[n]?.type === 'WAYPOINT' ? 0 : 1
      const nd = d + w
      if (nd < (dist.get(n) ?? Infinity)) {
        dist.set(n, nd)
        if (w === 0) deque.unshift(n)
        else deque.push(n)
      }
    }
  }
  const d = dist.get(toId)
  return d === undefined || d > 200 ? -1 : d
}

export function getSpace(id: string): BoardSpace {
  const space = BOARD[id]
  if (!space) throw new Error(`Case inconnue : ${id}`)
  return space
}

/** Coordonnées monde (R3F) d'une case : plan XZ, Y vertical. */
export function spaceWorldPos(id: string): [number, number, number] {
  const s = getSpace(id)
  return [s.x, 0, s.y]
}
