// Tests d'intégrité du plateau Woody Woods et des définitions de dés.
import { describe, expect, it } from 'vitest'
import {
  BOARD,
  FORK_IDS,
  MOLE_SPACE_ID,
  PREV,
  SIGNPOST_FORK_IDS,
  SPACE_IDS,
  STAR_SPOTS,
  START_SPACE_ID,
  WALL_SPACE_IDS,
} from './board'
import { DICE_BLOCKS, MINIGAMES, PODIUM_LAYOUTS } from './constants'
import type { DiceBlockId } from './types'

describe('plateau Woody Woods', () => {
  it('toutes les arêtes pointent vers des cases existantes', () => {
    for (const space of Object.values(BOARD)) {
      for (const next of space.nextSpaces) {
        expect(BOARD[next], `${space.id} -> ${next}`).toBeDefined()
      }
    }
  })

  it('aucune impasse : chaque case a au moins une sortie', () => {
    for (const space of Object.values(BOARD)) {
      expect(space.nextSpaces.length, space.id).toBeGreaterThan(0)
    }
  })

  it('chaque case a au moins une entrée (boucles fermées)', () => {
    for (const id of SPACE_IDS) {
      expect(PREV[id].length, id).toBeGreaterThan(0)
    }
  })

  it('toutes les cases sont atteignables depuis le départ', () => {
    const seen = new Set<string>([START_SPACE_ID])
    const queue = [START_SPACE_ID]
    while (queue.length > 0) {
      const id = queue.pop()!
      for (const next of BOARD[id].nextSpaces) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    expect(seen.size).toBe(SPACE_IDS.length)
  })

  it('le plateau est assez grand pour une vraie partie (≥ 75 cases)', () => {
    expect(SPACE_IDS.length).toBeGreaterThanOrEqual(75)
  })

  it('4 emplacements d’Étoile, 5 forks dont 3 à panneau', () => {
    expect(STAR_SPOTS).toHaveLength(4)
    // les tronçons bidirectionnels créent des jonctions-choix en plus
    // des 5 forks "historiques" de la map
    expect(FORK_IDS.length).toBeGreaterThanOrEqual(5)
    expect(SIGNPOST_FORK_IDS).toHaveLength(3)
    for (const id of SIGNPOST_FORK_IDS) expect(FORK_IDS).toContain(id)
    for (const id of STAR_SPOTS) expect(BOARD[id]).toBeDefined()
  })

  it('chaque case EVENT panneau précède directement un fork à panneau', () => {
    const signposts = Object.values(BOARD).filter((s) => s.event === 'SIGNPOST')
    expect(signposts.length).toBe(3)
    for (const s of signposts) {
      expect(SIGNPOST_FORK_IDS).toContain(s.nextSpaces[0])
      expect(BOARD[s.nextSpaces[0]].nextSpaces.length).toBeGreaterThan(1)
    }
  })

  it('points d’intérêt : trou, mur, Boo et Topi Taupe', () => {
    const pits = Object.values(BOARD).filter((s) => s.event === 'PIT')
    expect(pits).toHaveLength(1)
    expect(WALL_SPACE_IDS).toHaveLength(1)
    expect(Object.values(BOARD).filter((s) => s.hasBoo)).toHaveLength(1)
    expect(MOLE_SPACE_ID).not.toBeNull()
    expect(BOARD[MOLE_SPACE_ID!]).toBeDefined()
  })
})

describe('définitions des dés', () => {
  it('tous les dés ont exactement 6 faces', () => {
    for (const block of Object.values(DICE_BLOCKS)) {
      expect(block.faces, block.id).toHaveLength(6)
    }
  })

  it('les dés de récompense respectent les plages du cahier des charges', () => {
    const ranges: Record<string, [number, number]> = {
      GOLD: [4, 10],
      SILVER: [3, 8],
      CURSED: [1, 3],
      NORMAL: [1, 6],
    }
    for (const [id, [min, max]] of Object.entries(ranges)) {
      for (const face of DICE_BLOCKS[id as DiceBlockId].faces) {
        expect(face.value, id).toBeGreaterThanOrEqual(min)
        expect(face.value, id).toBeLessThanOrEqual(max)
      }
    }
  })

  it('le dé normal est bien 1-2-3-4-5-6 (wiki SMP)', () => {
    expect(DICE_BLOCKS.NORMAL.faces.map((f) => f.value)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('le dé Bowser correspond au wiki (0/-3, 0/-3, 1, 8, 9, 10)', () => {
    const faces = DICE_BLOCKS.BOWSER.faces
    expect(faces.map((f) => f.value)).toEqual([0, 0, 1, 8, 9, 10])
    expect(faces[0].coins).toBe(-3)
    expect(faces[1].coins).toBe(-3)
  })
})

describe('configuration des minijeux et du podium', () => {
  it('la roulette a 3 catégories non vides', () => {
    for (const list of Object.values(MINIGAMES)) {
      expect(list.length).toBeGreaterThan(0)
    }
  })

  it('chaque layout de podium place exactement 4 joueurs', () => {
    for (const [category, layout] of Object.entries(PODIUM_LAYOUTS)) {
      const total = layout.reduce((acc, slot) => acc + slot.count, 0)
      expect(total, category).toBe(4)
    }
  })

  it('le layout FFA garde les récompenses du cahier des charges', () => {
    const ffa = PODIUM_LAYOUTS.FFA
    expect(ffa.map((s) => s.dice)).toEqual(['GOLD', 'SILVER', null, 'CURSED'])
    expect(ffa.map((s) => s.sips)).toEqual([0, 1, 2, 3])
  })

  it('le layout 2v2 fait 2 gagnants / 2 perdants', () => {
    expect(PODIUM_LAYOUTS['2v2'].map((s) => s.count)).toEqual([2, 2])
  })

  it('le layout 1v1 fait vainqueur / perdant / 2 spectateurs', () => {
    expect(PODIUM_LAYOUTS['1v1'].map((s) => s.count)).toEqual([1, 1, 2])
  })
})
