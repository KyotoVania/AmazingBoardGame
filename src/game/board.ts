// ============================================================
// board.ts — Le plateau Woody Woods sous forme de graphe (~80
// cases), retracé fidèlement depuis Docs/imgMap.png :
//   - boucle extérieure complète (bas → ouest → nord → est)
//   - bande centrale horizontale ouest → est
//   - connecteur ouest (avec LE TROU) et connecteur centre
//   - boucle intérieure sud-est (avec LE MUR sur le raccourci)
//   - mini-boucle près du départ
// Embranchements : 3 forks à PANNEAUX (la direction est dictée
// par le panneau, règles réelles) + 2 forks LIBRES (choix).
// Sens de circulation : anti-horaire (flèches de la map).
// ============================================================

import type { BoardSpace } from './types'

type SpaceSeed = Omit<BoardSpace, 'nextSpaces'> & { next: string[] }

const SEEDS: SpaceSeed[] = [
  // ----- Boucle extérieure : bord bas, vers l'ouest -----
  { id: 'o01', type: 'START', x: 8.0, y: 6.3, next: ['o02'] },
  { id: 'o02', type: 'BLUE', x: 6.9, y: 6.5, next: ['o03'] },
  // Fork LIBRE : mini-boucle du départ (raccourci vers le spot étoile sud-est)
  { id: 'o03', type: 'BLUE', x: 5.8, y: 6.6, next: ['o04', 'q01'], branchLabels: ['Grand tour du plateau', 'Mini-boucle (spot étoile)'] },
  { id: 'o04', type: 'BLUE', x: 4.7, y: 6.6, next: ['o05'] },
  { id: 'o05', type: 'ITEM', x: 3.6, y: 6.5, next: ['o06'] },
  { id: 'o06', type: 'SIP_PLUS', x: 2.5, y: 6.4, next: ['o07'] },
  { id: 'o07', type: 'BLUE', x: 1.4, y: 6.4, next: ['o08'] },
  { id: 'o08', type: 'EVENT', event: 'SIGNPOST', x: 0.3, y: 6.4, next: ['o09'] },
  // Fork à PANNEAU n°1 : continuer à l'ouest ou monter au centre
  { id: 'o09', type: 'BLUE', x: -0.8, y: 6.3, next: ['o10', 'c01'], branchLabels: ['Route de l’ouest (arbre généreux)', 'Vers le centre (LE TROU)'] },
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
  { id: 'o19', type: 'BLUE', x: -7.4, y: -0.9, next: ['o20', 'm01'], branchLabels: ['Route du nord (arbre maudit)', 'Bande centrale'] },
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
  { id: 'o32', type: 'BLUE', x: 3.8, y: -6.0, next: ['o33', 'c11'], branchLabels: ['Route de l’est (spot étoile)', 'Plongée vers le centre'] },
  { id: 'o33', type: 'ITEM', x: 4.9, y: -5.8, next: ['o34'] },
  { id: 'o34', type: 'BLUE', x: 6.0, y: -5.6, next: ['o35'] },
  { id: 'o35', type: 'BLUE', x: 7.0, y: -5.2, next: ['o36'] },
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
  { id: 'm04', type: 'BLUE', x: -3.0, y: -1.0, next: ['m05'] },
  { id: 'm05', type: 'BLUE', x: -1.9, y: -1.0, next: ['m06'] },
  { id: 'm06', type: 'VS', x: -0.8, y: -1.0, next: ['m07'] },
  { id: 'm07', type: 'BLUE', x: 0.3, y: -1.0, next: ['m08'] },
  { id: 'm08', type: 'BLUE', x: 1.4, y: -0.9, next: ['m09'] },
  // Fork LIBRE : raccourci par la boucle intérieure (gardé par LE MUR)
  { id: 'm09', type: 'BLUE', x: 2.5, y: -0.9, next: ['m10', 'l01'], branchLabels: ['Route principale', 'Raccourci muré 🧱'] },
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
  { id: 'c05', type: 'BLUE', x: -1.3, y: 0.9, next: ['c06'] },
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
  { id: 'q01', type: 'BLUE', x: 5.5, y: 5.7, next: ['q02'] },
  { id: 'q02', type: 'BLUE', x: 4.9, y: 4.8, next: ['l06'], starSpot: true },
]

/**
 * Échelle du plateau : écarte les cases (les seeds sont tracés serrés
 * depuis imgMap) pour une map plus aérée et lisible.
 */
export const BOARD_SCALE = 1.6

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

/** Le plateau, indexé par id de case. */
export const BOARD: Record<string, BoardSpace> = Object.fromEntries(
  SEEDS.map((s) => {
    const { next, ...rest } = s
    return [s.id, { ...rest, x: s.x * BOARD_SCALE, y: s.y * BOARD_SCALE, nextSpaces: [...next] }]
  }),
)

// Ajoute les arêtes inverses manquantes des tronçons bidirectionnels.
for (const chain of TWO_WAY_CHAINS) {
  for (let i = 0; i < chain.length - 1; i++) {
    const a = BOARD[chain[i]]
    const b = BOARD[chain[i + 1]]
    if (!a.nextSpaces.includes(b.id)) a.nextSpaces.push(b.id)
    if (!b.nextSpaces.includes(a.id)) b.nextSpaces.push(a.id)
  }
}

export const SPACE_IDS: string[] = SEEDS.map((s) => s.id)

/** Graphe inversé : pour le recul de l'arbre maudit. */
export const PREV: Record<string, string[]> = (() => {
  const prev: Record<string, string[]> = {}
  for (const id of SPACE_IDS) prev[id] = []
  for (const space of Object.values(BOARD)) {
    for (const next of space.nextSpaces) prev[next].push(space.id)
  }
  return prev
})()

/** Emplacements candidats de l'Étoile (points jaunes de la map). */
export const STAR_SPOTS: string[] = SEEDS.filter((s) => s.starSpot).map((s) => s.id)

/**
 * Les vraies cases de CHOIX : depuis au moins une case d'arrivée, il
 * reste ≥ 2 directions une fois le demi-tour exclu. (Les simples
 * nœuds de tronçon bidirectionnel — 2 sorties mais qui se réduisent
 * toujours à "continuer tout droit" — sont exclus.)
 */
export const FORK_IDS: string[] = Object.values(BOARD)
  .filter((space) => {
    if (space.nextSpaces.length < 2) return false
    const incomings = Object.values(BOARD)
      .filter((p) => p.nextSpaces.includes(space.id))
      .map((p) => p.id)
    return incomings.some(
      (from) => space.nextSpaces.filter((n) => n !== from).length >= 2,
    )
  })
  .map((space) => space.id)

/**
 * Forks gouvernés par un PANNEAU (la case EVENT/SIGNPOST juste avant) :
 * la direction y est dictée par le panneau — règles réelles de Woody Woods.
 * Les autres forks restent au libre choix du joueur.
 */
export const SIGNPOST_FORK_IDS: string[] = SEEDS.filter((s) => s.event === 'SIGNPOST').map(
  (s) => s.next[0],
)

/** Cases portant un mur destructible. */
export const WALL_SPACE_IDS: string[] = SEEDS.filter((s) => s.wall).map((s) => s.id)

/** Case occupée par Topi Taupe. */
export const MOLE_SPACE_ID: string | null = SEEDS.find((s) => s.hasMole)?.id ?? null

/** Case de la boutique de Flutter. */
export const SHOP_SPACE_ID: string | null = SEEDS.find((s) => s.hasShop)?.id ?? null

/** Les 3 cases événement devant chaque arbre. */
export const TREE_GOOD_IDS: string[] = SEEDS.filter((s) => s.event === 'TREE_GOOD').map((s) => s.id)
export const TREE_BAD_IDS: string[] = SEEDS.filter((s) => s.event === 'TREE_BAD').map((s) => s.id)

export const START_SPACE_ID = 'o01'

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
