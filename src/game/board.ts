// ============================================================
// board.ts — Le plateau Woody Woods sous forme de graphe.
// Topologie et points d'intérêt calqués sur Docs/imgMap.png +
// Docs/BoardMarioParty : boucle extérieure, boucles intérieures,
// 3 embranchements à panneaux, arbre gentil (bas), arbre maudit
// (haut), Boo au nord, 3 emplacements d'Étoile.
// Sens de circulation : anti-horaire (flèches de la map).
// ============================================================

import type { BoardSpace } from './types'

type SpaceSeed = Omit<BoardSpace, 'nextSpaces'> & { next: string[] }

const SEEDS: SpaceSeed[] = [
  // ----- Boucle extérieure : bord bas, vers l'ouest -----
  { id: 's01', type: 'START', x: 8.4, y: 4.9, next: ['s02'] },
  { id: 's02', type: 'BLUE', x: 7.2, y: 5.3, next: ['s03'] },
  { id: 's03', type: 'BLUE', x: 6.0, y: 5.5, next: ['s04'] },
  { id: 's04', type: 'ITEM', x: 4.8, y: 5.5, next: ['s05'] },
  { id: 's05', type: 'EVENT', event: 'SIGNPOST', x: 3.6, y: 5.4, next: ['s06'] },
  // Fork A (panneau) : continuer à l'ouest ou plonger au centre
  { id: 's06', type: 'BLUE', x: 2.4, y: 5.2, next: ['s07', 'i01'] },
  { id: 's07', type: 'SIP_PLUS', x: 1.2, y: 5.3, next: ['s08'] },
  { id: 's08', type: 'BLUE', x: 0.0, y: 5.5, next: ['s09'] },
  { id: 's09', type: 'RED', x: -1.2, y: 5.5, next: ['s10'] },
  { id: 's10', type: 'BLUE', x: -2.4, y: 5.3, next: ['s11'], starSpot: true },
  { id: 's11', type: 'BLUE', x: -3.6, y: 5.0, next: ['s12'] },
  { id: 's12', type: 'EVENT', event: 'TREE_GOOD', x: -4.8, y: 4.6, next: ['s13'] },
  { id: 's13', type: 'BLUE', x: -5.9, y: 4.0, next: ['s14'] },
  // ----- Bord ouest, vers le nord -----
  { id: 's14', type: 'SIP_MINUS', x: -6.8, y: 3.2, next: ['s15'] },
  { id: 's15', type: 'BLUE', x: -7.3, y: 2.2, next: ['s16'] },
  { id: 's16', type: 'RED', x: -7.5, y: 1.1, next: ['s17'] },
  { id: 's17', type: 'BLUE', x: -7.5, y: 0.0, next: ['s18'], starSpot: true },
  { id: 's18', type: 'ITEM', x: -7.3, y: -1.1, next: ['s19'] },
  { id: 's19', type: 'BLUE', x: -7.0, y: -2.2, next: ['s20'] },
  { id: 's20', type: 'LUCKY', x: -6.6, y: -3.2, next: ['s21'] },
  { id: 's21', type: 'EVENT', event: 'TREE_BAD', x: -6.1, y: -4.2, next: ['s22'] },
  // ----- Bord nord, vers l'est -----
  { id: 's22', type: 'BLUE', x: -5.0, y: -4.9, next: ['s23'] },
  { id: 's23', type: 'BLUE', x: -3.8, y: -5.3, next: ['s24'] },
  { id: 's24', type: 'EVENT', event: 'SIGNPOST', x: -2.6, y: -5.5, next: ['s25'] },
  // Fork B (panneau) : continuer à l'est ou descendre au centre
  { id: 's25', type: 'BLUE', x: -1.4, y: -5.5, next: ['s26', 'j01'] },
  { id: 's26', type: 'SIP_PLUS', x: -0.2, y: -5.4, next: ['s27'] },
  { id: 's27', type: 'VS', x: 1.0, y: -5.2, next: ['s28'] },
  { id: 's28', type: 'BLUE', x: 2.2, y: -5.0, next: ['s29'], hasBoo: true },
  { id: 's29', type: 'BLUE', x: 3.4, y: -4.8, next: ['s30'] },
  { id: 's30', type: 'ITEM', x: 4.6, y: -4.6, next: ['s31'] },
  { id: 's31', type: 'BLUE', x: 5.8, y: -4.3, next: ['s32'] },
  // ----- Bord est, vers le sud -----
  { id: 's32', type: 'RED', x: 6.6, y: -3.4, next: ['s33'] },
  { id: 's33', type: 'BLUE', x: 7.1, y: -2.3, next: ['s34'] },
  { id: 's34', type: 'BLUE', x: 7.4, y: -1.2, next: ['s35'], starSpot: true },
  { id: 's35', type: 'LUCKY', x: 7.5, y: 0.0, next: ['s36'] },
  { id: 's36', type: 'BLUE', x: 7.4, y: 1.2, next: ['s37'] },
  { id: 's37', type: 'BAD_LUCK', x: 7.3, y: 2.4, next: ['s38'] },
  { id: 's38', type: 'BLUE', x: 7.8, y: 3.6, next: ['s01'] },

  // ----- Branche intérieure depuis le fork A (remonte au nord) -----
  { id: 'i01', type: 'BLUE', x: 2.5, y: 3.9, next: ['i02'] },
  { id: 'i02', type: 'EVENT', event: 'SIGNPOST', x: 2.7, y: 2.7, next: ['i03'] },
  // Fork C (panneau) : vers le centre-ouest ou rejoindre le bord est
  { id: 'i03', type: 'BLUE', x: 2.9, y: 1.5, next: ['i04', 'r01'] },
  { id: 'i04', type: 'SIP_MINUS', x: 1.7, y: 0.9, next: ['i05'] },
  { id: 'i05', type: 'VS', x: 0.5, y: 0.5, next: ['i06'] },
  { id: 'i06', type: 'BLUE', x: -0.7, y: 0.3, next: ['i07'] },
  { id: 'i07', type: 'ITEM', x: -1.9, y: 0.1, next: ['i08'] },
  { id: 'i08', type: 'BLUE', x: -3.1, y: -0.2, next: ['i09'] },
  { id: 'i09', type: 'BLUE', x: -4.1, y: -1.0, next: ['i10'] },
  { id: 'i10', type: 'RED', x: -4.6, y: -2.0, next: ['i11'] },
  { id: 'i11', type: 'BLUE', x: -4.9, y: -3.1, next: ['s22'] },

  // ----- Descente centrale depuis le fork B -----
  { id: 'j01', type: 'BLUE', x: -1.3, y: -4.2, next: ['j02'] },
  { id: 'j02', type: 'RED', x: -1.1, y: -3.0, next: ['j03'] },
  { id: 'j03', type: 'BLUE', x: -1.0, y: -1.8, next: ['j04'] },
  { id: 'j04', type: 'BLUE', x: -0.8, y: -0.7, next: ['i06'] },

  // ----- Raccourci est depuis le fork C -----
  { id: 'r01', type: 'BLUE', x: 4.1, y: 1.3, next: ['r02'] },
  { id: 'r02', type: 'SIP_PLUS', x: 5.3, y: 1.0, next: ['r03'] },
  { id: 'r03', type: 'VS', x: 6.4, y: 1.1, next: ['s36'] },
]

/** Le plateau, indexé par id de case. */
export const BOARD: Record<string, BoardSpace> = Object.fromEntries(
  SEEDS.map((s) => {
    const { next, ...rest } = s
    return [s.id, { ...rest, nextSpaces: next }]
  }),
)

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

/** Cases d'embranchement (plusieurs sorties). */
export const FORK_IDS: string[] = SEEDS.filter((s) => s.next.length > 1).map((s) => s.id)

export const START_SPACE_ID = 's01'

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
