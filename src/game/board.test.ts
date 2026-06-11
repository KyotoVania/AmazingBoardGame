// Tests d'intégrité du plateau Woody Woods et des définitions de dés.
import { describe, expect, it } from 'vitest'
import { BOARD, FORK_IDS, PREV, SPACE_IDS, STAR_SPOTS, START_SPACE_ID } from './board'
import { DICE_BLOCKS, MINIGAMES, PODIUM_REWARDS } from './constants'
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

  it('3 emplacements d’Étoile et 3 embranchements à panneau', () => {
    expect(STAR_SPOTS).toHaveLength(3)
    expect(FORK_IDS).toHaveLength(3)
    for (const id of STAR_SPOTS) expect(BOARD[id]).toBeDefined()
  })

  it('chaque case EVENT panneau précède directement un fork', () => {
    const signposts = Object.values(BOARD).filter((s) => s.event === 'SIGNPOST')
    expect(signposts.length).toBe(3)
    for (const s of signposts) {
      expect(FORK_IDS).toContain(s.nextSpaces[0])
    }
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

  it('le podium définit 4 récompenses (or/argent/normal/maudit)', () => {
    expect(PODIUM_REWARDS).toHaveLength(4)
    expect(PODIUM_REWARDS[0].dice).toBe('GOLD')
    expect(PODIUM_REWARDS[1].dice).toBe('SILVER')
    expect(PODIUM_REWARDS[2].dice).toBeNull()
    expect(PODIUM_REWARDS[3].dice).toBe('CURSED')
    expect(PODIUM_REWARDS.map((r) => r.sips)).toEqual([0, 1, 2, 3])
  })
})
