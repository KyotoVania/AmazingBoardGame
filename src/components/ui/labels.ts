// Libellés et helpers d'affichage partagés entre les overlays.
import type { SpaceType } from '../../game/types'

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  START: 'Départ',
  BLUE: 'Case Bleue',
  RED: 'Case Rouge',
  EVENT: 'Événement',
  ITEM: 'Case Item',
  LUCKY: 'Case Chance',
  BAD_LUCK: 'Case Poisse',
  VS: 'Case VS',
  SIP_PLUS: 'Gorgées !',
  SIP_MINUS: 'Distribution',
}

/** Flèche cardinal-ish entre deux cases (vue du dessus, y vers le bas). */
export function arrowFor(dx: number, dy: number): string {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? '➡️' : '⬅️'
  return dy > 0 ? '⬇️' : '⬆️'
}
