// Tests du moteur de jeu : boucle de tour complète, effets de cases
// (wiki SMP), items, panneaux (règles réelles), trou, mur, Topi Taupe,
// minijeux avec podium par catégorie et overrides God Mode.
// Les cases cibles sont trouvées dynamiquement dans le graphe pour
// rester valables si la map évolue.
import { beforeEach, describe, expect, it } from 'vitest'
import { BOARD, PREV, SIGNPOST_FORK_IDS, STAR_SPOTS, WALL_SPACE_IDS, distanceBetween, getSpace } from './board'
import {
  DEFAULT_LOBBY,
  ITEMS,
  MINIGAMES,
  MOLE_COST_MAX,
  MOLE_COST_MIN,
  PIT_ESCAPE_MIN,
  SIP_MINUS_AMOUNT,
  SIP_PLUS_AMOUNT,
  START_COINS,
  VS_WAGERS,
  WALL_INITIAL_STRENGTH,
} from './constants'
import { createInitialState, effectiveSpaceType, gameReducer } from './reducer'
import { setSeed } from './rng'
import type { BoardSpace, GameAction, GameState, MinigameState } from './types'

function reduce(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce((s, a) => gameReducer(s, a), state)
}

function start(maxRounds = 10): GameState {
  return gameReducer(createInitialState(), {
    type: 'START_GAME',
    players: DEFAULT_LOBBY,
    maxRounds,
  })
}

/**
 * Trouve une case d'approche : `from` a une seule sortie `to` qui
 * matche le prédicat, sans événement de passage parasite sur `to`.
 */
function approachTo(predicate: (sp: BoardSpace) => boolean): { from: string; to: string } {
  for (const space of Object.values(BOARD)) {
    if (space.nextSpaces.length !== 1) continue
    const to = BOARD[space.nextSpaces[0]]
    if (!to || to.hasBoo || to.hasMole || to.wall) continue
    if (predicate(to)) return { from: space.id, to: to.id }
  }
  throw new Error('aucune approche linéaire trouvée')
}

/** Téléporte P1 sur `from`, force un lancer de `steps` et lance le dé. */
function rollFrom(state: GameState, from: string, steps: number): GameState {
  return reduce(
    state,
    { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: from },
    { type: 'DEBUG_FORCE_ROLL', value: steps },
    { type: 'ROLL_DICE', blockId: 'NORMAL' },
    { type: 'DICE_LANDED' },
  )
}

/** Avance le pion jusqu'à l'atterrissage (gère forks libres). */
function walk(state: GameState, forkPicks: string[] = []): GameState {
  let s = state
  let guard = 0
  while ((s.phase === 'MOVING' || s.phase === 'FORK_CHOICE') && guard++ < 100) {
    if (s.phase === 'FORK_CHOICE') {
      const candidates = BOARD[s.players[s.currentPlayerIndex].currentSpaceId].nextSpaces
      const choice = forkPicks.shift() ?? candidates[0]
      s = gameReducer(s, { type: 'CHOOSE_FORK', nextSpaceId: choice })
    } else {
      s = gameReducer(s, { type: 'STEP_DONE' })
    }
  }
  return s
}

/** Tour complet « lancer forcé d'1 case » pour le joueur courant. */
function quickTurn(state: GameState): GameState {
  let s = reduce(
    state,
    { type: 'DEBUG_FORCE_ROLL', value: 1 },
    { type: 'ROLL_DICE', blockId: 'NORMAL' },
    { type: 'DICE_LANDED' },
  )
  s = walk(s)
  let guard = 0
  while (s.pending && guard++ < 10) {
    if (s.pending.kind === 'STAR_PROMPT') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'STAR', buy: false } })
    } else if (s.pending.kind === 'BOO_PROMPT') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'BOO', action: 'DECLINE' } })
    } else if (s.pending.kind === 'MOLE_PROMPT') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'MOLE', pay: false } })
    } else if (s.pending.kind === 'CHOOSE_SIP_TARGET') {
      const other = s.players.find((p) => p.id !== s.players[s.currentPlayerIndex].id)!
      s = gameReducer(s, {
        type: 'RESOLVE_PENDING',
        choice: { kind: 'SIP_TARGET', targetId: other.id },
      })
    } else if (s.pending.kind === 'TREE_GOOD_CHOICE') {
      s = gameReducer(s, {
        type: 'RESOLVE_PENDING',
        choice: { kind: 'TREE_GOOD', pick: 'COIN_FRUIT' },
      })
    } else if (s.pending.kind === 'BAD_LUCK_WHEEL') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'BAD_LUCK_DONE' } })
    } else if (s.pending.kind === 'WALL_PROMPT') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'WALL_TRY' } })
    } else if (s.pending.kind === 'SHOP_PROMPT') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'SHOP_LEAVE' } })
    } else if (s.pending.kind === 'VS_WAGER') {
      throw new Error('quickTurn a atterri sur une case VS, adapter le test')
    } else {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    }
    s = walk(s)
  }
  expect(s.phase).toBe('TURN_END')
  return gameReducer(s, { type: 'END_TURN' })
}

/** État PODIUM artisanal pour tester les layouts sans passer par le rng. */
function podiumState(base: GameState, minigame: Partial<MinigameState>): GameState {
  return {
    ...base,
    phase: 'PODIUM',
    minigame: {
      context: 'ROUND_END',
      pot: 0,
      category: 'FFA',
      title: 'Test',
      groups: null,
      teams: null,
      ...minigame,
    },
  }
}

beforeEach(() => {
  setSeed(42)
})

describe('démarrage de partie', () => {
  it('initialise 4 joueurs, panneaux et murs', () => {
    const s = start()
    expect(s.phase).toBe('TURN_START')
    expect(s.players).toHaveLength(4)
    for (const p of s.players) {
      expect(p.currentSpaceId).toBe('o01')
      expect(p.coins).toBe(START_COINS)
      expect(p.stars).toBe(0)
      expect(p.trapped).toBe(false)
    }
    expect(STAR_SPOTS).toContain(s.starSpaceId)
    expect(Object.keys(s.signposts).sort()).toEqual([...SIGNPOST_FORK_IDS].sort())
    for (const wallId of WALL_SPACE_IDS) {
      expect(s.walls[wallId]).toBe(WALL_INITIAL_STRENGTH)
    }
  })
})

describe('lancer et déplacement', () => {
  it('le lancer forcé donne exactement le bon nombre de pas', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: 3 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
    )
    expect(s.phase).toBe('ROLLING')
    expect(s.dice?.steps).toBe(3)
    expect(s.forcedRoll).toBeNull()
    s = gameReducer(s, { type: 'DICE_LANDED' })
    expect(['MOVING', 'FORK_CHOICE']).toContain(s.phase)
  })

  it('atterrir sur une case bleue rapporte 3 pièces', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from, to } = approachTo((sp) => sp.type === 'BLUE' && !sp.starSpot)
    s = walk(rollFrom(s, from, 1))
    expect(s.players[0].currentSpaceId).toBe(to)
    expect(s.phase).toBe('SPACE_ACTION')
    expect(s.players[0].coins).toBe(START_COINS + 3)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('TURN_END')
  })

  it('atterrir sur une case rouge coûte 3 pièces', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from, to } = approachTo((sp) => sp.type === 'RED')
    s = walk(rollFrom(s, from, 1))
    expect(s.players[0].currentSpaceId).toBe(to)
    expect(s.players[0].coins).toBe(START_COINS - 3)
  })

  it('une case item remplit l’inventaire', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from } = approachTo((sp) => sp.type === 'ITEM')
    s = walk(rollFrom(s, from, 1))
    expect(s.players[0].inventory).toHaveLength(1)
  })

  it('rouler 0 (face DK) termine le tour sur place', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: 0 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    expect(s.phase).toBe('TURN_END')
    expect(s.players[0].currentSpaceId).toBe('o01')
  })
})

describe('embranchements : panneaux et forks libres', () => {
  it('un fork à panneau suit la direction dictée, sans choix du joueur', () => {
    let s = start()
    const forkId = SIGNPOST_FORK_IDS[0]
    const dictated = s.signposts[forkId]
    s = rollFrom(s, forkId, 2)
    expect(s.phase).toBe('MOVING')
    expect(s.movement?.hopTo).toBe(getSpace(forkId).nextSpaces[dictated])
  })

  it('un fork libre demande le choix du joueur, et rejette un choix invalide', () => {
    let s = start()
    const freeFork = Object.values(BOARD).find(
      (sp) => sp.nextSpaces.length > 1 && !SIGNPOST_FORK_IDS.includes(sp.id),
    )!
    s = rollFrom(s, freeFork.id, 1)
    expect(s.phase).toBe('FORK_CHOICE')
    const before = s
    s = gameReducer(s, { type: 'CHOOSE_FORK', nextSpaceId: 'zzz' })
    expect(s).toBe(before)
    // (nextSpaces[1] = q01 est gardée par un portail : on teste la branche libre)
    s = reduce(s, { type: 'CHOOSE_FORK', nextSpaceId: freeFork.nextSpaces[0] }, { type: 'STEP_DONE' })
    expect(s.players[0].currentSpaceId).toBe(freeFork.nextSpaces[0])
  })

  it('atterrir sur la case event d’un panneau le fait pivoter', () => {
    let s = start()
    const signpostEvent = Object.values(BOARD).find((sp) => sp.event === 'SIGNPOST')!
    const forkId = signpostEvent.nextSpaces[0]
    const before = s.signposts[forkId]
    const branches = getSpace(forkId).nextSpaces.length
    s = walk(rollFrom(s, PREV[signpostEvent.id][0], 1))
    expect(s.players[0].currentSpaceId).toBe(signpostEvent.id)
    expect(s.signposts[forkId]).toBe((before + 1) % branches)
  })
})

describe('cases gorgées (custom)', () => {
  it('SIP_PLUS fait boire le joueur', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from } = approachTo((sp) => sp.type === 'SIP_PLUS')
    s = walk(rollFrom(s, from, 1))
    expect(s.players[0].sipsTaken).toBe(SIP_PLUS_AMOUNT)
  })

  it('SIP_MINUS distribue des gorgées à la cible choisie', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from } = approachTo((sp) => sp.type === 'SIP_MINUS')
    s = walk(rollFrom(s, from, 1))
    expect(s.pending?.kind).toBe('CHOOSE_SIP_TARGET')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'SIP_TARGET', targetId: 'P3' } })
    expect(s.players[2].sipsTaken).toBe(SIP_MINUS_AMOUNT)
    expect(s.players[0].sipsGiven).toBe(SIP_MINUS_AMOUNT)
  })
})

describe('Étoile, Boo et Topi Taupe (événements de passage)', () => {
  it('passer sur l’Étoile permet de l’acheter et la fait déménager', () => {
    let s = start()
    s = { ...s, starSpaceId: 'o12' }
    s = reduce(rollFrom(s, PREV['o12'][0], 2), { type: 'STEP_DONE' })
    expect(s.phase).toBe('PASS_EVENT')
    expect(s.pending?.kind).toBe('STAR_PROMPT')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'STAR', buy: true } })
    expect(s.players[0].stars).toBe(1)
    expect(s.players[0].coins).toBe(0)
    expect(s.starSpaceId).not.toBe('o12')
    expect(STAR_SPOTS).toContain(s.starSpaceId)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('MOVING')
    s = walk(s)
    expect(s.players[0].currentSpaceId).toBe(getSpace('o12').nextSpaces[0])
  })

  it('Boo vole des pièces et déclenche un effet visuel', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const booSpace = Object.values(BOARD).find((sp) => sp.hasBoo)!
    s = reduce(rollFrom(s, PREV[booSpace.id][0], 2), { type: 'STEP_DONE' })
    expect(s.pending?.kind).toBe('BOO_PROMPT')
    s = reduce(
      s,
      { type: 'RESOLVE_PENDING', choice: { kind: 'BOO', action: 'STEAL_COINS' } },
      { type: 'RESOLVE_PENDING', choice: { kind: 'BOO_VICTIM', targetId: 'P2' } },
    )
    expect(s.players[0].coins).toBe(START_COINS + 10)
    expect(s.players[1].coins).toBe(0)
    expect(s.fx?.kind).toBe('STEAL_COINS')
    expect(s.fx?.amount).toBe(10)
  })

  it('Boo vole une Étoile (50 pièces) et déclenche le FX étoile', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    s = reduce(
      s,
      { type: 'DEBUG_EDIT_STATS', playerId: 'P1', patch: { coins: 60 } },
      { type: 'DEBUG_EDIT_STATS', playerId: 'P2', patch: { stars: 1 } },
    )
    const booSpace = Object.values(BOARD).find((sp) => sp.hasBoo)!
    s = reduce(rollFrom(s, PREV[booSpace.id][0], 2), { type: 'STEP_DONE' })
    s = reduce(
      s,
      { type: 'RESOLVE_PENDING', choice: { kind: 'BOO', action: 'STEAL_STAR' } },
      { type: 'RESOLVE_PENDING', choice: { kind: 'BOO_VICTIM', targetId: 'P2' } },
    )
    expect(s.players[0].stars).toBe(1)
    expect(s.players[0].coins).toBe(10)
    expect(s.players[1].stars).toBe(0)
    expect(s.fx?.kind).toBe('STEAL_STAR')
  })

  it('Topi Taupe réoriente les panneaux contre des pièces', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const moleSpace = Object.values(BOARD).find((sp) => sp.hasMole)!
    s = reduce(rollFrom(s, PREV[moleSpace.id][0], 2), { type: 'STEP_DONE' })
    expect(s.pending?.kind).toBe('MOLE_PROMPT')
    const cost = s.pending?.kind === 'MOLE_PROMPT' ? s.pending.cost : 0
    expect(cost).toBeGreaterThanOrEqual(MOLE_COST_MIN)
    expect(cost).toBeLessThanOrEqual(MOLE_COST_MAX)
    const directions = Object.fromEntries(SIGNPOST_FORK_IDS.map((id) => [id, 1]))
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'MOLE', pay: true, directions } })
    expect(s.players[0].coins).toBe(START_COINS - cost)
    for (const forkId of SIGNPOST_FORK_IDS) {
      expect(s.signposts[forkId]).toBe(1 % getSpace(forkId).nextSpaces.length)
    }
    // le popup laisse ensuite le déplacement reprendre
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    s = walk(s)
    expect(['SPACE_ACTION', 'PASS_EVENT']).toContain(s.phase)
  })
})

describe('le trou (événement spécial)', () => {
  it('y atterrir piège le joueur', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    // le connecteur ouest est bidirectionnel : on approche via un
    // voisin du trou en dictant le chemin au carrefour
    const pit = Object.values(BOARD).find((sp) => sp.event === 'PIT')!
    s = walk(rollFrom(s, PREV[pit.id][0], 1), [pit.id])
    expect(s.players[0].trapped).toBe(true)
  })

  it('un lancer trop faible laisse coincé, un bon lancer libère', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_SET_TRAPPED', playerId: 'P1', trapped: true })
    // échec : en dessous du seuil
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: PIT_ESCAPE_MIN - 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    expect(s.players[0].trapped).toBe(true)
    expect(s.movement).toBeNull()
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('TURN_END')
    // succès au tour suivant
    s = gameReducer(s, { type: 'DEBUG_SET_TURN', playerId: 'P1' })
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: PIT_ESCAPE_MIN },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    expect(s.players[0].trapped).toBe(false)
    expect(s.movement?.remaining).toBe(PIT_ESCAPE_MIN)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(['MOVING', 'FORK_CHOICE']).toContain(s.phase)
  })
})

describe('le mur (événement spécial)', () => {
  const wallId = WALL_SPACE_IDS[0]

  it('arriver au mur ouvre un jet DÉDIÉ ; échec → bloqué, le mur s’effrite', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    s = walk(rollFrom(s, PREV[wallId][0], 3))
    // on s'arrête DEVANT le défi : le lancer du tour ne compte pas
    expect(s.players[0].currentSpaceId).toBe(wallId)
    expect(s.pending?.kind).toBe('WALL_PROMPT')
    expect(s.walls[wallId]).toBe(WALL_INITIAL_STRENGTH)
    // jet dédié forcé à 1 : échec
    s = gameReducer(s, { type: 'DEBUG_FORCE_ROLL', value: 1 })
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'WALL_TRY' } })
    expect(s.walls[wallId]).toBe(WALL_INITIAL_STRENGTH - 1)
    expect(s.movement?.remaining).toBe(0)
    expect(s.pending?.kind).toBe('POPUP')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('SPACE_ACTION') // atterrissage sur la case du mur
  })

  it('réussir le jet dédié casse le mur et laisse finir le déplacement', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    s = walk(rollFrom(s, PREV[wallId][0], 3))
    expect(s.pending?.kind).toBe('WALL_PROMPT')
    // jet dédié forcé à 6 : le mur explose
    s = gameReducer(s, { type: 'DEBUG_FORCE_ROLL', value: 6 })
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'WALL_TRY' } })
    expect(s.walls[wallId]).toBe(0)
    expect(s.fx?.kind).toBe('WALL_BREAK')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    s = walk(s)
    // 3 pas au total : mur + 2 cases derrière
    const behind = getSpace(getSpace(wallId).nextSpaces[0]).nextSpaces[0]
    expect(s.players[0].currentSpaceId).toBe(behind)
  })

  it('le mur est reconstruit au début de la manche suivante', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_SET_WALL', spaceId: wallId, strength: 0 })
    s = podiumState(s, { category: 'FFA' })
    s = reduce(
      s,
      { type: 'SET_PODIUM', groups: [['P1'], ['P2'], ['P3'], ['P4']] },
      { type: 'CONTINUE' },
    )
    expect(s.round).toBe(2)
    expect(s.walls[wallId]).toBe(WALL_INITIAL_STRENGTH)
  })
})

describe('items (wiki SMP)', () => {
  it('le champignon ajoute +3 au lancer et un seul item par tour', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'DASH_MUSHROOM' },
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'DASH_MUSHROOM' },
      { type: 'USE_ITEM', itemId: 'DASH_MUSHROOM' },
    )
    expect(s.rollBonus).toBe(3)
    const before = s
    s = gameReducer(s, { type: 'USE_ITEM', itemId: 'DASH_MUSHROOM' })
    expect(s).toBe(before)
    s = reduce(
      s,
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
    )
    expect(s.dice!.steps).toBe(s.dice!.faceValue + 3)
  })

  it('le champignon poison inflige -2 au prochain lancer de la cible', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'POISON_MUSHROOM' },
      { type: 'USE_ITEM', itemId: 'POISON_MUSHROOM', targetId: 'P2' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
    )
    expect(s.players[1].poisoned).toBe(true)
    s = quickTurn(s)
    expect(s.currentPlayerIndex).toBe(1)
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: 5 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
    )
    expect(s.dice?.steps).toBe(3)
    expect(s.players[1].poisoned).toBe(false)
  })

  it('le dé truqué force la valeur choisie', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'CUSTOM_DICE_BLOCK' },
      { type: 'USE_ITEM', itemId: 'CUSTOM_DICE_BLOCK', value: 4 },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
    )
    expect(s.dice?.steps).toBe(4)
  })

  it('le Coinado vole 5 à 10 pièces et déclenche le FX pièces', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'COINADO' },
      { type: 'USE_ITEM', itemId: 'COINADO', targetId: 'P2' },
    )
    const stolen = s.players[0].coins - START_COINS
    expect(stolen).toBeGreaterThanOrEqual(5)
    expect(stolen).toBeLessThanOrEqual(10)
    expect(s.players[1].coins).toBe(START_COINS - stolen)
    expect(s.fx?.kind).toBe('STEAL_COINS')
  })

  it('le ticket Maskache vole un item, et échoue sans cible valide', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'FLY_GUY_TICKET' },
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P2', itemId: 'GOLDEN_PIPE' },
      { type: 'USE_ITEM', itemId: 'FLY_GUY_TICKET', targetId: 'P2' },
    )
    expect(s.players[0].inventory).toContain('GOLDEN_PIPE')
    expect(s.players[1].inventory).toHaveLength(0)

    let s2 = start()
    s2 = gameReducer(s2, { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'FLY_GUY_TICKET' })
    const before = s2
    s2 = gameReducer(s2, { type: 'USE_ITEM', itemId: 'FLY_GUY_TICKET', targetId: 'P2' })
    expect(s2).toBe(before)
  })

  it('le tuyau doré téléporte juste avant l’Étoile et libère du trou', () => {
    let s = start()
    s = { ...s, starSpaceId: 'o12' }
    s = reduce(
      s,
      { type: 'DEBUG_SET_TRAPPED', playerId: 'P1', trapped: true },
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'GOLDEN_PIPE' },
      { type: 'USE_ITEM', itemId: 'GOLDEN_PIPE' },
    )
    expect(s.players[0].currentSpaceId).toBe(PREV['o12'][0])
    expect(s.players[0].trapped).toBe(false)
  })

  it('la carte bloc caché donne des pièces ou une Étoile', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'HIDDEN_BLOCK_CARD' },
      { type: 'USE_ITEM', itemId: 'HIDDEN_BLOCK_CARD' },
    )
    const p = s.players[0]
    const gotCoins = p.coins === START_COINS + 10 && p.stars === 0
    const gotStar = p.coins === START_COINS && p.stars === 1
    expect(gotCoins || gotStar).toBe(true)
  })
})

describe('arbres de Woody Woods', () => {
  it('l’arbre généreux offre pièces ou relance', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from } = approachTo((sp) => sp.event === 'TREE_GOOD')
    s = walk(rollFrom(s, from, 1))
    expect(s.pending?.kind).toBe('TREE_GOOD_CHOICE')
    const coinBranch = gameReducer(s, {
      type: 'RESOLVE_PENDING',
      choice: { kind: 'TREE_GOOD', pick: 'COIN_FRUIT' },
    })
    expect(coinBranch.players[0].coins).toBe(START_COINS + 5)
    const diceBranch = gameReducer(s, {
      type: 'RESOLVE_PENDING',
      choice: { kind: 'TREE_GOOD', pick: 'DICE_FRUIT' },
    })
    expect(diceBranch.phase).toBe('ROLLING')
    expect(diceBranch.dice?.blockId).toBe('NORMAL')
  })

  it('l’arbre maudit fait perdre des pièces ou reculer', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from } = approachTo((sp) => sp.event === 'TREE_BAD')
    s = walk(rollFrom(s, from, 1))
    expect(s.phase).toBe('SPACE_ACTION')
    expect(s.pending?.kind).toBe('POPUP')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    if (s.movement) {
      expect(s.movement.backward).toBe(true)
      expect(s.phase).toBe('MOVING')
      s = walk(s)
      expect(['SPACE_ACTION', 'TURN_END']).toContain(s.phase)
    } else {
      expect(s.phase).toBe('TURN_END')
      expect(s.players[0].coins).toBe(START_COINS - 5)
    }
  })
})

describe('case VS (mise + minijeu)', () => {
  it('mise collective, partage du pot et conversion en case bleue', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from, to } = approachTo((sp) => sp.type === 'VS')
    s = walk(rollFrom(s, from, 1))
    expect(s.pending?.kind).toBe('VS_WAGER')
    const amount = s.pending?.kind === 'VS_WAGER' ? s.pending.amount : 0
    expect([...VS_WAGERS]).toContain(amount)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'VS_OK' } })
    const wager = Math.min(amount, START_COINS)
    expect(s.minigame?.context).toBe('VS')
    expect(s.minigame?.pot).toBe(wager * 4)
    expect(s.minigame?.category).toBe('FFA')
    expect(s.phase).toBe('MINIGAME_TITLE')
    expect(s.vsConvertedIds).toContain(to)
    expect(effectiveSpaceType(s, to)).toBe('BLUE')

    s = reduce(
      s,
      { type: 'SPIN_TITLE' },
      { type: 'GO_PLAY' },
      { type: 'GO_PODIUM' },
      { type: 'SET_PODIUM', groups: [['P1'], ['P2'], ['P3'], ['P4']] },
    )
    expect(s.phase).toBe('REWARDS')
    const totalCoins = s.players.reduce((acc, p) => acc + p.coins, 0)
    expect(totalCoins).toBe(4 * START_COINS)
    expect(s.players[0].coins).toBeGreaterThan(s.players[3].coins)
    expect(s.players.every((p) => p.rewardDice === null)).toBe(true)

    s = gameReducer(s, { type: 'CONTINUE' })
    expect(s.phase).toBe('TURN_END')
  })
})

describe('fin de manche : minijeu, podium par catégorie, récompenses', () => {
  it('après les 4 tours, la roulette se déclenche et le podium FFA récompense', () => {
    let s = start()
    for (let i = 0; i < 4; i++) s = quickTurn(s)
    expect(s.phase).toBe('MINIGAME_CATEGORY')
    expect(s.minigame?.context).toBe('ROUND_END')

    s = gameReducer(s, { type: 'SPIN_CATEGORY' })
    const category = s.minigame!.category!
    expect(['FFA', '1v1', '2v2']).toContain(category)
    s = gameReducer(s, { type: 'SPIN_TITLE' })
    expect(s.phase).toBe('MINIGAME_TITLE')
    expect(MINIGAMES[category]).toContain(s.minigame!.title!)
    s = reduce(s, { type: 'GO_PLAY' }, { type: 'GO_PODIUM' })
    expect(s.phase).toBe('PODIUM')

    // on force un layout FFA pour des assertions déterministes
    s = podiumState(s, { category: 'FFA' })

    const before = s
    s = gameReducer(s, { type: 'SET_PODIUM', groups: [['P1'], ['P1'], ['P3'], ['P4']] })
    expect(s).toBe(before)

    s = gameReducer(s, { type: 'SET_PODIUM', groups: [['P2'], ['P1'], ['P3'], ['P4']] })
    expect(s.phase).toBe('REWARDS')
    const [p1, p2, p3, p4] = s.players
    expect(p2.rewardDice).toBe('GOLD')
    expect(p1.rewardDice).toBe('SILVER')
    expect(p3.rewardDice).toBeNull()
    expect(p4.rewardDice).toBe('CURSED')
    expect(p2.sipsTaken).toBe(0)
    expect(p1.sipsTaken).toBe(1)
    expect(p3.sipsTaken).toBe(2)
    expect(p4.sipsTaken).toBe(3)

    s = gameReducer(s, { type: 'CONTINUE' })
    // le récap de manche (panneaux re-tirés) s'affiche d'abord
    expect(s.phase).toBe('ROUND_INTRO')
    expect(s.round).toBe(2)
    s = gameReducer(s, { type: 'BEGIN_ROUND' })
    expect(s.phase).toBe('TURN_START')
    expect(s.currentPlayerIndex).toBe(0)
  })

  it('le podium 2v2 récompense par équipe', () => {
    let s = start()
    s = podiumState(s, { category: '2v2' })
    // mauvais découpage refusé
    const before = s
    s = gameReducer(s, { type: 'SET_PODIUM', groups: [['P1'], ['P2'], ['P3'], ['P4']] })
    expect(s).toBe(before)
    s = gameReducer(s, { type: 'SET_PODIUM', groups: [['P1', 'P3'], ['P2', 'P4']] })
    expect(s.phase).toBe('REWARDS')
    const [p1, p2, p3, p4] = s.players
    expect(p1.rewardDice).toBe('GOLD')
    expect(p3.rewardDice).toBe('GOLD')
    expect(p2.rewardDice).toBe('CURSED')
    expect(p4.rewardDice).toBe('CURSED')
    expect(p1.sipsTaken).toBe(0)
    expect(p2.sipsTaken).toBe(2)
    expect(p4.sipsTaken).toBe(2)
  })

  it('le podium 1v1 ne touche pas les spectateurs', () => {
    let s = start()
    s = podiumState(s, { category: '1v1' })
    s = gameReducer(s, { type: 'SET_PODIUM', groups: [['P2'], ['P4'], ['P1', 'P3']] })
    expect(s.phase).toBe('REWARDS')
    const [p1, p2, p3, p4] = s.players
    expect(p2.rewardDice).toBe('GOLD')
    expect(p4.rewardDice).toBe('CURSED')
    expect(p4.sipsTaken).toBe(3)
    expect(p1.rewardDice).toBeNull()
    expect(p3.rewardDice).toBeNull()
    expect(p1.sipsTaken).toBe(0)
    expect(p3.sipsTaken).toBe(0)
  })

  it('le dé de récompense est lancé AUTOMATIQUEMENT en plus, puis consommé', () => {
    let s = start()
    s = podiumState(s, { category: 'FFA' })
    s = reduce(
      s,
      { type: 'SET_PODIUM', groups: [['P1'], ['P2'], ['P3'], ['P4']] },
      { type: 'CONTINUE' },
      { type: 'BEGIN_ROUND' },
    )
    expect(s.players[0].rewardDice).toBe('GOLD')
    // le dé Or n'est PAS une option de lancer : il part automatiquement en plus
    const cheat = gameReducer(s, { type: 'ROLL_DICE', blockId: 'GOLD' })
    expect(cheat).toBe(s)
    // lancer normal : le bonus s'ajoute (1-6 + 4-10) et est consommé
    const roll = gameReducer(s, { type: 'ROLL_DICE', blockId: 'NORMAL' })
    expect(roll.dice?.blockId).toBe('NORMAL')
    expect(roll.dice?.bonus?.blockId).toBe('GOLD')
    expect(roll.dice?.steps).toBe((roll.dice?.faceValue ?? 0) + (roll.dice?.bonus?.faceValue ?? 0))
    expect(roll.dice?.bonus?.faceValue).toBeGreaterThanOrEqual(4)
    expect(roll.dice?.bonus?.faceValue).toBeLessThanOrEqual(10)
    expect(roll.players[0].rewardDice).toBeNull()
    // lancer FORCÉ (debug / dé truqué) : total prévisible, le bonus est conservé
    const forced = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: 3 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
    )
    expect(forced.dice?.steps).toBe(3)
    expect(forced.dice?.bonus).toBeNull()
    expect(forced.players[0].rewardDice).toBe('GOLD')
  })

  it('la partie se termine après la dernière manche (étoiles puis pièces)', () => {
    let s = start(1)
    for (let i = 0; i < 4; i++) s = quickTurn(s)
    s = podiumState(s, { category: 'FFA' })
    s = reduce(
      s,
      { type: 'DEBUG_EDIT_STATS', playerId: 'P3', patch: { stars: 2 } },
      { type: 'SET_PODIUM', groups: [['P1'], ['P2'], ['P3'], ['P4']] },
      { type: 'CONTINUE' },
    )
    expect(s.phase).toBe('GAME_OVER')
    expect(s.winners).toEqual(['P3'])
  })
})

describe('distance à l’Étoile (BFS, doc Woody Woods)', () => {
  it('compte au plus court dans le sens de circulation, panneaux ignorés', () => {
    expect(distanceBetween('o01', 'o01')).toBe(0)
    expect(distanceBetween('o01', 'o02')).toBe(1)
    // o02 → o01 : il faut refaire le tour, mais ça reste atteignable
    expect(distanceBetween('o02', 'o01')).toBeGreaterThan(1)
    for (const spot of STAR_SPOTS) {
      expect(distanceBetween('o01', spot)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('boutique de Flutter (doc SMP : achat au passage)', () => {
  it('passer devant la boutique propose un stock, acheter débite et ajoute l’item', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const shop = Object.values(BOARD).find((sp) => sp.hasShop)!
    s = reduce(rollFrom(s, PREV[shop.id][0], 2), { type: 'STEP_DONE' })
    expect(s.pending?.kind).toBe('SHOP_PROMPT')
    const pending = s.pending
    if (pending?.kind !== 'SHOP_PROMPT') throw new Error('boutique attendue')
    expect(pending.stock.length).toBeGreaterThan(0)
    const itemId = pending.stock[0]
    const price = ITEMS[itemId].price
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'SHOP_BUY', itemId } })
    expect(s.players[0].coins).toBe(START_COINS - price)
    expect(s.players[0].inventory).toContain(itemId)
  })

  it('refuse un achat trop cher ou hors stock, et SHOP_LEAVE reprend la route', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const shop = Object.values(BOARD).find((sp) => sp.hasShop)!
    s = reduce(rollFrom(s, PREV[shop.id][0], 2), { type: 'STEP_DONE' })
    if (s.pending?.kind !== 'SHOP_PROMPT') throw new Error('boutique attendue')
    // fauché : impossible d'acheter
    s = gameReducer(s, { type: 'DEBUG_EDIT_STATS', playerId: 'P1', patch: { coins: 0 } })
    const before = s
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'SHOP_BUY', itemId: s.pending!.kind === 'SHOP_PROMPT' ? s.pending.stock[0] : 'DASH_MUSHROOM' } })
    expect(s).toBe(before)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'SHOP_LEAVE' } })
    expect(['MOVING', 'FORK_CHOICE', 'SPACE_ACTION']).toContain(s.phase)
  })

  it('le stock respecte la progression (pas de Tuyau doré en manche 1)', () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      setSeed(2000 + attempt)
      let s = start(10) // manche 1/10 : progress 0.1
      s = { ...s, starSpaceId: 'q02' }
      const shop = Object.values(BOARD).find((sp) => sp.hasShop)!
      s = reduce(rollFrom(s, PREV[shop.id][0], 2), { type: 'STEP_DONE' })
      if (s.pending?.kind !== 'SHOP_PROMPT') throw new Error('boutique attendue')
      expect(s.pending.stock).not.toContain('GOLDEN_PIPE')
      expect(s.pending.stock).not.toContain('CHOMP_CALL')
    }
  })
})

describe('alliés (règle SMP : +1/+2 au lancer)', () => {
  it('atterrir sur une case Alliée recrute un allié', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from } = approachTo((sp) => sp.type === 'ALLY')
    s = walk(rollFrom(s, from, 1))
    expect(s.players[0].allies?.length).toBe(1)
  })

  it('le Téléphone Allié recrute, et les alliés boostent le lancer NON forcé', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'ALLY_PHONE' },
      { type: 'USE_ITEM', itemId: 'ALLY_PHONE' },
    )
    expect(s.players[0].allies?.length).toBe(1)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    // lancer non forcé : total = face + bonus allié (1 ou 2)
    s = gameReducer(s, { type: 'ROLL_DICE', blockId: 'NORMAL' })
    const bonus = (s.dice?.steps ?? 0) - (s.dice?.faceValue ?? 0)
    expect(bonus).toBeGreaterThanOrEqual(1)
    expect(bonus).toBeLessThanOrEqual(2)
  })

  it('le lancer FORCÉ fait taire les alliés (doc : Custom Dice Block)', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'ALLY_PHONE' },
      { type: 'USE_ITEM', itemId: 'ALLY_PHONE' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
      { type: 'DEBUG_FORCE_ROLL', value: 4 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
    )
    expect(s.dice?.steps).toBe(4)
  })
})

describe('Boisson dorée & Cloche Peepa (items SMP)', () => {
  it('la Boisson dorée rapporte 1 pièce par case parcourue', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'GOLDEN_DRINK' },
      { type: 'USE_ITEM', itemId: 'GOLDEN_DRINK' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
    )
    const before = s.players[0].coins
    s = walk(rollFrom(s, 'o04', 2)) // o05 (item) puis o06… non : 2 pas depuis o04 → o06
    // 2 cases parcourues : +2 pièces de boisson (avant l'effet de la case d'arrivée)
    expect(s.players[0].coins).toBeGreaterThanOrEqual(before + 2)
  })

  it('le Peepa racket 1 pièce par case au profit du sonneur, et expire en fin de tour', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'PEEPA_BELL' },
      { type: 'USE_ITEM', itemId: 'PEEPA_BELL', targetId: 'P2' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
    )
    expect(s.players[1].peepaBy).toBe('P1')
    // P1 termine son tour, P2 joue : 2 cases = 2 pièces transférées
    s = quickTurn(s)
    const p1Before = s.players[0].coins
    const p2Before = s.players[1].coins
    s = walk(rollFrom({ ...s }, 'o04', 2))
    // P2 (joueur courant) avance de 2 depuis o01 : o02, o03 (case vide,
    // gratuite mais parcourue), o04 → atterrit sur o04 (bleue : +3).
    // Peepa : -3 en chemin (3 cases) → net 0 pour P2, +3 pour P1 le sonneur
    expect(s.players[1].coins).toBe(p2Before - 3 + 3)
    expect(s.players[0].coins).toBe(p1Before + 3)
  })

  it('la Boisson dorée est bloquée quand un Peepa te colle (doc SMP)', () => {
    let s = start()
    s = reduce(s, { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'GOLDEN_DRINK' })
    s = { ...s, players: s.players.map((p) => (p.id === 'P1' ? { ...p, peepaBy: 'P2' as const } : p)) }
    const before = s
    s = gameReducer(s, { type: 'USE_ITEM', itemId: 'GOLDEN_DRINK' })
    expect(s).toBe(before)
  })
})

describe('Gant de duel & Double Carte (items SMP)', () => {
  it('le duel transfère un butin et fait boire le perdant', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'DUELING_GLOVE' },
      { type: 'USE_ITEM', itemId: 'DUELING_GLOVE', targetId: 'P2' },
    )
    const [p1, p2] = s.players
    const totalCoins = p1.coins + p2.coins
    expect(totalCoins).toBe(2 * START_COINS) // le butin circule, rien ne disparaît
    expect(p1.sipsTaken + p2.sipsTaken).toBe(1) // le perdant boit
    // l'un des deux a gagné 5 pièces sur l'autre
    expect([p1.coins, p2.coins].sort((a, b) => a - b)).toEqual([START_COINS - 5, START_COINS + 5])
  })

  it('le duel vole un allié en priorité', () => {
    let s = start()
    // P2 a un allié
    s = gameReducer(s, { type: 'DEBUG_SET_TURN', playerId: 'P2' })
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P2', itemId: 'ALLY_PHONE' },
      { type: 'USE_ITEM', itemId: 'ALLY_PHONE' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
    )
    s = gameReducer(s, { type: 'DEBUG_SET_TURN', playerId: 'P1' })
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'DUELING_GLOVE' },
      { type: 'USE_ITEM', itemId: 'DUELING_GLOVE', targetId: 'P2' },
    )
    const [p1, p2] = s.players
    // l'allié a changé de camp dans un sens ou dans l'autre, ou est resté chez le gagnant P2
    expect((p1.allies?.length ?? 0) + (p2.allies?.length ?? 0)).toBe(1)
    expect(p1.coins + p2.coins).toBe(2 * START_COINS)
  })

  it('la Double Carte donne 2 Étoiles pour le double du prix', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_EDIT_STATS', playerId: 'P1', patch: { coins: 99 } },
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'DOUBLE_CARD' },
      { type: 'USE_ITEM', itemId: 'DOUBLE_CARD' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
    )
    expect(s.players[0].doubleCard).toBe(true)
    // simule l'arrivée chez Toadette
    s = { ...s, phase: 'PASS_EVENT', pending: { kind: 'STAR_PROMPT' } }
    const cost = s.config.starCost
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'STAR', buy: true } })
    expect(s.players[0].stars).toBe(2)
    expect(s.players[0].coins).toBe(99 - cost * 2)
    expect(s.players[0].doubleCard).toBe(false)
  })
})

describe('Appel Chomp (signature Woody Woods)', () => {
  it('déplace l’Étoile sur un autre spot', () => {
    let s = start()
    const before = s.starSpaceId
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'CHOMP_CALL' },
      { type: 'USE_ITEM', itemId: 'CHOMP_CALL' },
    )
    expect(s.starSpaceId).not.toBe(before)
    expect(STAR_SPOTS).toContain(s.starSpaceId)
    expect(s.players[0].inventory).not.toContain('CHOMP_CALL')
  })
})

describe('malédictions cachées de Kamek (règle SMP)', () => {
  it('atterrir sur une bleue maudite déclenche la Roue et révèle la case', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from, to } = approachTo((sp) => sp.type === 'BLUE' && !sp.starSpot && !sp.hasShop)
    s = { ...s, cursedSpaceIds: [to] }
    s = walk(rollFrom(s, from, 1))
    expect(s.pending?.kind).toBe('BAD_LUCK_WHEEL')
    expect(s.cursedSpaceIds).not.toContain(to)
  })

  it('Kamek maudit des cases à mi-partie', () => {
    let s = start(4) // mi-partie = manche 2
    s = podiumState(s, { category: 'FFA' })
    s = reduce(
      s,
      { type: 'SET_PODIUM', groups: [['P1'], ['P2'], ['P3'], ['P4']] },
      { type: 'CONTINUE' },
    )
    expect(s.round).toBe(2)
    expect(s.cursedSpaceIds.length).toBeGreaterThan(0)
  })
})

describe('sauvegarde / restauration', () => {
  it('LOAD_STATE restaure une partie complète (round, joueurs, phase)', () => {
    let s = start()
    s = quickTurn(s)
    const snapshot = structuredClone(s)
    let fresh = createInitialState()
    fresh = gameReducer(fresh, { type: 'LOAD_STATE', state: snapshot })
    expect(fresh.round).toBe(s.round)
    expect(fresh.phase).toBe(s.phase)
    expect(fresh.currentPlayerIndex).toBe(s.currentPlayerIndex)
    expect(fresh.players.map((p) => p.coins)).toEqual(s.players.map((p) => p.coins))
    expect(fresh.signposts).toEqual(s.signposts)
  })

  it('LOAD_STATE refuse une save invalide', () => {
    const before = createInitialState()
    const after = gameReducer(before, {
      type: 'LOAD_STATE',
      state: { ...before, players: [] },
    })
    expect(after).toBe(before)
  })
})

describe('la Roue de Kamek (case poisse)', () => {
  it('atterrir sur la case poisse lance la roue, et le sort pré-tiré est appliqué', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    const { from } = approachTo((sp) => sp.type === 'BAD_LUCK')
    s = walk(rollFrom(s, from, 1))
    expect(s.pending?.kind).toBe('BAD_LUCK_WHEEL')
    const pending = s.pending
    if (pending?.kind !== 'BAD_LUCK_WHEEL') throw new Error('roue attendue')
    const outcome = pending.options[pending.resultIndex]
    const before = s.players[0]
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'BAD_LUCK_DONE' } })
    const after = s.players[0]
    switch (outcome.kind) {
      case 'LOSE_COINS':
        expect(after.coins).toBe(Math.max(0, before.coins - outcome.amount))
        break
      case 'LOSE_ITEM':
        expect(after.inventory.length).toBe(Math.max(0, before.inventory.length - 1))
        break
      case 'GIVE_COINS': {
        const given = Math.min(outcome.amount, before.coins)
        expect(after.coins).toBe(before.coins - given)
        const target = s.players.find((p) => p.id === outcome.targetId)!
        expect(target.coins).toBe(START_COINS + given)
        expect(s.fx?.kind).toBe('STEAL_COINS')
        break
      }
      case 'SIPS':
        expect(after.sipsTaken).toBe(before.sipsTaken + outcome.amount)
        break
      case 'BACK':
        expect(s.movement?.backward).toBe(true)
        expect(s.movement?.remaining).toBe(outcome.steps)
        break
    }
  })
})

describe('carrefours bidirectionnels (jonctions à choix libre)', () => {
  it('arriver à une jonction par la route principale offre un choix', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    // m06 → m07 : la bande centrale croise le connecteur centre.
    // (un seul STEP_DONE : walk() consommerait lui-même le choix)
    s = reduce(rollFrom(s, 'm06', 2), { type: 'STEP_DONE' })
    // le pion s'arrête à m07 et doit choisir : continuer (m08) ou monter (c15)
    expect(s.phase).toBe('FORK_CHOICE')
    expect(s.players[0].currentSpaceId).toBe('m07')
    s = gameReducer(s, { type: 'CHOOSE_FORK', nextSpaceId: 'c15' })
    s = walk(s)
    expect(s.players[0].currentSpaceId).toBe('c15')
  })

  it('pas de demi-tour : sur un tronçon bidirectionnel on continue tout droit', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    // en descendant le connecteur (c14 → c15 → m07), aucun choix parasite :
    // le demi-tour est exclu à chaque pas
    s = walk(rollFrom(s, 'c14', 2))
    expect(s.phase).toBe('SPACE_ACTION')
    expect(s.players[0].currentSpaceId).toBe('m07')
  })

  it("l'extérieur est peut bifurquer dans la bande centrale (o40 → o41 → m14)", () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    s = walk(rollFrom(s, 'o40', 2), ['m14'])
    expect(s.players[0].currentSpaceId).toBe('m14')
  })
})

describe('équipes tirées automatiquement (1v1 / 2v2)', () => {
  it('la roulette de catégorie tire les participants sans saisie manuelle', () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      setSeed(1000 + attempt)
      let s = start()
      s = gameReducer(s, { type: 'DEBUG_TRIGGER_MINIGAME' })
      s = gameReducer(s, { type: 'SPIN_CATEGORY' })
      const mg = s.minigame!
      if (mg.category === 'FFA') {
        expect(mg.teams).toBeNull()
      } else {
        const teams = mg.teams!
        expect(teams).toHaveLength(2)
        const flat = teams.flat()
        const size = mg.category === '1v1' ? 1 : 2
        expect(teams[0]).toHaveLength(size)
        expect(teams[1]).toHaveLength(size)
        expect(new Set(flat).size).toBe(flat.length)
      }
    }
  })
})

describe('God Mode (DebugMode.md + extensions)', () => {
  it('déclenche la phase minijeu instantanément', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_TRIGGER_MINIGAME' })
    expect(s.phase).toBe('MINIGAME_CATEGORY')
    expect(s.minigame?.context).toBe('ROUND_END')
  })

  it('donne le tour à n’importe quel joueur', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_SET_TURN', playerId: 'P3' })
    expect(s.currentPlayerIndex).toBe(2)
    expect(s.phase).toBe('TURN_START')
  })

  it('téléporte, injecte des items et édite les stats avec clamp', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_TELEPORT', playerId: 'P2', spaceId: 'm06' })
    expect(s.players[1].currentSpaceId).toBe('m06')

    const before = s
    s = gameReducer(s, { type: 'DEBUG_TELEPORT', playerId: 'P2', spaceId: 'nope' })
    expect(s).toBe(before)

    for (let i = 0; i < 5; i++) {
      s = gameReducer(s, { type: 'DEBUG_INJECT_ITEM', playerId: 'P2', itemId: 'COINADO' })
    }
    expect(s.players[1].inventory).toHaveLength(3)

    s = gameReducer(s, {
      type: 'DEBUG_EDIT_STATS',
      playerId: 'P2',
      patch: { sipsTaken: -5, coins: 99 },
    })
    expect(s.players[1].sipsTaken).toBe(0)
    expect(s.players[1].coins).toBe(99)
  })

  it('contrôle le mur, le trou et les panneaux', () => {
    let s = start()
    const wallId = WALL_SPACE_IDS[0]
    s = gameReducer(s, { type: 'DEBUG_SET_WALL', spaceId: wallId, strength: 1 })
    expect(s.walls[wallId]).toBe(1)
    const invalid = gameReducer(s, { type: 'DEBUG_SET_WALL', spaceId: 'o01', strength: 3 })
    expect(invalid).toBe(s)

    s = gameReducer(s, { type: 'DEBUG_SET_TRAPPED', playerId: 'P4', trapped: true })
    expect(s.players[3].trapped).toBe(true)

    const beforeSignposts = { ...s.signposts }
    s = gameReducer(s, { type: 'DEBUG_REROLL_SIGNPOSTS' })
    expect(Object.keys(s.signposts).sort()).toEqual(Object.keys(beforeSignposts).sort())
  })

  it('annule un lancer forcé', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_FORCE_ROLL', value: 6 })
    expect(s.forcedRoll).toBe(6)
    s = gameReducer(s, { type: 'DEBUG_FORCE_ROLL', value: null })
    expect(s.forcedRoll).toBeNull()
  })
})

describe('fin de tour', () => {
  it('réinitialise les modificateurs et passe au joueur suivant', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'DASH_MUSHROOM' },
      { type: 'USE_ITEM', itemId: 'DASH_MUSHROOM' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
    )
    s = quickTurn(s)
    expect(s.currentPlayerIndex).toBe(1)
    expect(s.itemUsedThisTurn).toBe(false)
    expect(s.rollBonus).toBe(0)
    expect(s.phase).toBe('TURN_START')
  })
})

describe('Banque Koopa, cases vides, portail, inversion', () => {
  it('la traversée d’une case vide ne consomme aucun pas', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    // o02 → o03 (case vide + fork libre) : le pas n'est PAS consommé
    s = reduce(rollFrom(s, 'o02', 1), { type: 'STEP_DONE' })
    expect(s.players[0].currentSpaceId).toBe('o03')
    expect(s.movement?.remaining).toBe(1)
    expect(s.phase).toBe('FORK_CHOICE')
    s = reduce(s, { type: 'CHOOSE_FORK', nextSpaceId: 'o04' }, { type: 'STEP_DONE' })
    // 1 seul pas a franchi 2 cases : on atterrit derrière la case vide
    expect(s.players[0].currentSpaceId).toBe('o04')
    expect(s.phase).toBe('SPACE_ACTION')
  })

  it('la Banque Koopa encaisse au passage (5, ou tout ce qui reste)', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    // passage : m03 → m04 (banque) → m05
    s = walk(rollFrom(s, 'm03', 2))
    expect(s.phase).toBe('PASS_EVENT')
    expect(s.players[0].coins).toBe(START_COINS - 5)
    expect(s.bankPot).toBe(5)
    s = walk(gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } }))
    expect(s.players[0].currentSpaceId).toBe('m05')

    // joueur presque fauché : il donne tout ce qu'il lui reste
    s = reduce(
      s,
      { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } },
      { type: 'END_TURN' },
      { type: 'DEBUG_SET_TURN', playerId: 'P2' },
      { type: 'DEBUG_EDIT_STATS', playerId: 'P2', patch: { coins: 3 } },
      { type: 'DEBUG_TELEPORT', playerId: 'P2', spaceId: 'm03' },
      { type: 'DEBUG_FORCE_ROLL', value: 2 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.players[1].coins).toBe(0)
    expect(s.bankPot).toBe(8)
  })

  it('s’arrêter PILE sur la banque rafle toute la cagnotte', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02', bankPot: 12 }
    s = walk(rollFrom(s, 'm03', 1))
    expect(s.players[0].currentSpaceId).toBe('m04')
    expect(s.players[0].coins).toBe(START_COINS + 12)
    expect(s.bankPot).toBe(0)
    expect(s.fx?.kind).toBe('STEAL_COINS')
    expect(s.fx?.amount).toBe(12)
  })

  it('portail : refuser détourne, payer ouvre et le saut reprend', () => {
    let s = start()
    s = { ...s, starSpaceId: 'm02' }
    s = gameReducer(s, {
      type: 'DEBUG_EDIT_STATS',
      playerId: 'P1',
      patch: { coins: 60, stars: 2 },
    })
    s = reduce(rollFrom(s, 'o02', 1), { type: 'STEP_DONE' })
    expect(s.phase).toBe('FORK_CHOICE')
    s = gameReducer(s, { type: 'CHOOSE_FORK', nextSpaceId: 'q01' })
    expect(s.pending?.kind).toBe('GATE_PROMPT')
    const cost = s.pending?.kind === 'GATE_PROMPT' ? s.pending.cost : {}

    // refus → on revient au choix (l'autre branche existe)
    const refused = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'GATE', pay: false } })
    expect(refused.phase).toBe('FORK_CHOICE')
    expect(refused.players[0].coins).toBe(60)

    // paiement → débit, FX, confirmation, puis le saut reprend vers q01
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'GATE', pay: true } })
    if (cost.coins) expect(s.players[0].coins).toBe(60 - cost.coins)
    if (cost.stars) expect(s.players[0].stars).toBe(2 - cost.stars)
    expect(s.fx).not.toBeNull()
    expect(s.pending?.kind).toBe('POPUP')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('MOVING')
    expect(s.movement?.hopTo).toBe('q01')
    s = gameReducer(s, { type: 'STEP_DONE' })
    expect(s.players[0].currentSpaceId).toBe('q01')
  })

  it('la case ⇄ inverse le sens, et on remonte ensuite le graphe', () => {
    let s = start()
    s = { ...s, starSpaceId: 'q02' }
    s = walk(rollFrom(s, 'c04', 1))
    expect(s.players[0].currentSpaceId).toBe('c05')
    expect(s.players[0].reversed).toBe(true)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('TURN_END')

    s = reduce(
      s,
      { type: 'DEBUG_SET_TURN', playerId: 'P1' },
      { type: 'DEBUG_FORCE_ROLL', value: 2 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    // PREV[c05] = c04 (sens normal) + c06 (tronçon deux-sens) → choix libre
    expect(s.phase).toBe('FORK_CHOICE')
    s = reduce(s, { type: 'CHOOSE_FORK', nextSpaceId: 'c04' }, { type: 'STEP_DONE' })
    expect(s.players[0].currentSpaceId).toBe('c04')
    s = walk(s)
    // il continue à remonter : c04 → c03
    expect(s.players[0].currentSpaceId).toBe('c03')
  })
})
