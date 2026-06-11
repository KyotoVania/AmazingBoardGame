// Tests du moteur de jeu : la boucle de tour complète, les effets de
// cases (wiki SMP), les items, les minijeux et les overrides God Mode.
import { beforeEach, describe, expect, it } from 'vitest'
import { BOARD, PREV, STAR_SPOTS } from './board'
import {
  DEFAULT_LOBBY,
  MINIGAMES,
  SIP_MINUS_AMOUNT,
  SIP_PLUS_AMOUNT,
  START_COINS,
  VS_WAGERS,
} from './constants'
import { createInitialState, effectiveSpaceType, gameReducer } from './reducer'
import { setSeed } from './rng'
import type { GameAction, GameState } from './types'

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

/** Avance le pion jusqu'à l'atterrissage (gère forks et événements de passage). */
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
  // purge les éventuels prompts (étoile, boo, popups, choix)
  let guard = 0
  while (s.pending && guard++ < 10) {
    if (s.pending.kind === 'STAR_PROMPT') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'STAR', buy: false } })
    } else if (s.pending.kind === 'BOO_PROMPT') {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'BOO', action: 'DECLINE' } })
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
    } else if (s.pending.kind === 'VS_WAGER') {
      // pour les tours rapides on ne veut pas déclencher de minijeu : impossible à éviter,
      // mais aucun quickTurn de cette suite n'atterrit sur une case VS.
      throw new Error('quickTurn a atterri sur une case VS, adapter le test')
    } else {
      s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    }
    s = walk(s)
  }
  expect(s.phase).toBe('TURN_END')
  return gameReducer(s, { type: 'END_TURN' })
}

beforeEach(() => {
  setSeed(42)
})

describe('démarrage de partie', () => {
  it('initialise 4 joueurs sur la case départ', () => {
    const s = start()
    expect(s.phase).toBe('TURN_START')
    expect(s.players).toHaveLength(4)
    for (const p of s.players) {
      expect(p.currentSpaceId).toBe('s01')
      expect(p.coins).toBe(START_COINS)
      expect(p.stars).toBe(0)
      expect(p.inventory).toEqual([])
    }
    expect(STAR_SPOTS).toContain(s.starSpaceId)
    expect(Object.keys(s.signposts)).toHaveLength(3)
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
    expect(s.phase).toBe('MOVING')
    expect(s.movement?.remaining).toBe(3)
  })

  it('atterrir sur une case bleue rapporte 3 pièces', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.players[0].currentSpaceId).toBe('s02')
    expect(s.phase).toBe('SPACE_ACTION')
    expect(s.players[0].coins).toBe(START_COINS + 3)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('TURN_END')
  })

  it('atterrir sur une case rouge coûte 3 pièces', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's08' },
      { type: 'DEBUG_FORCE_ROLL', value: 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.players[0].currentSpaceId).toBe('s09')
    expect(s.players[0].coins).toBe(START_COINS - 3)
  })

  it('une case item remplit l’inventaire (3 max)', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: 3 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.players[0].currentSpaceId).toBe('s04')
    expect(s.players[0].inventory).toHaveLength(1)
  })

  it('un embranchement déclenche le choix du chemin', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's05' },
      { type: 'DEBUG_FORCE_ROLL', value: 2 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
      { type: 'STEP_DONE' },
    )
    expect(s.players[0].currentSpaceId).toBe('s06')
    expect(s.phase).toBe('FORK_CHOICE')
    // un choix invalide est ignoré
    const before = s
    s = gameReducer(s, { type: 'CHOOSE_FORK', nextSpaceId: 's99' })
    expect(s).toBe(before)
    s = reduce(s, { type: 'CHOOSE_FORK', nextSpaceId: 'i01' }, { type: 'STEP_DONE' })
    expect(s.players[0].currentSpaceId).toBe('i01')
    expect(s.phase).toBe('SPACE_ACTION')
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
    expect(s.players[0].currentSpaceId).toBe('s01')
  })
})

describe('cases gorgées (custom)', () => {
  it('SIP_PLUS fait boire le joueur', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's06' },
      { type: 'DEBUG_FORCE_ROLL', value: 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    expect(s.phase).toBe('FORK_CHOICE')
    s = reduce(s, { type: 'CHOOSE_FORK', nextSpaceId: 's07' }, { type: 'STEP_DONE' })
    expect(s.players[0].currentSpaceId).toBe('s07')
    expect(s.players[0].sipsTaken).toBe(SIP_PLUS_AMOUNT)
  })

  it('SIP_MINUS distribue des gorgées à la cible choisie', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's13' },
      { type: 'DEBUG_FORCE_ROLL', value: 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.pending?.kind).toBe('CHOOSE_SIP_TARGET')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'SIP_TARGET', targetId: 'P3' } })
    expect(s.players[2].sipsTaken).toBe(SIP_MINUS_AMOUNT)
    expect(s.players[0].sipsGiven).toBe(SIP_MINUS_AMOUNT)
  })
})

describe('Étoile et Boo (événements de passage)', () => {
  it('passer sur l’Étoile permet de l’acheter et la fait déménager', () => {
    let s = start()
    s = { ...s, starSpaceId: 's10' }
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's09' },
      { type: 'DEBUG_FORCE_ROLL', value: 2 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
      { type: 'STEP_DONE' },
    )
    expect(s.phase).toBe('PASS_EVENT')
    expect(s.pending?.kind).toBe('STAR_PROMPT')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'STAR', buy: true } })
    expect(s.players[0].stars).toBe(1)
    expect(s.players[0].coins).toBe(0)
    expect(s.starSpaceId).not.toBe('s10')
    expect(STAR_SPOTS).toContain(s.starSpaceId)
    // le popup de confirmation laisse ensuite le déplacement continuer
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    expect(s.phase).toBe('MOVING')
    s = walk(s)
    expect(s.players[0].currentSpaceId).toBe('s11')
  })

  it('refuser l’Étoile continue le déplacement', () => {
    let s = start()
    s = { ...s, starSpaceId: 's10' }
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's09' },
      { type: 'DEBUG_FORCE_ROLL', value: 2 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
      { type: 'STEP_DONE' },
      { type: 'RESOLVE_PENDING', choice: { kind: 'STAR', buy: false } },
    )
    expect(s.phase).toBe('MOVING')
  })

  it('Boo vole des pièces à la victime désignée', () => {
    let s = start()
    s = { ...s, starSpaceId: 's17' } // étoile ailleurs pour ne pas interférer
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's27' },
      { type: 'DEBUG_FORCE_ROLL', value: 2 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
      { type: 'STEP_DONE' },
    )
    expect(s.pending?.kind).toBe('BOO_PROMPT')
    s = reduce(
      s,
      { type: 'RESOLVE_PENDING', choice: { kind: 'BOO', action: 'STEAL_COINS' } },
      { type: 'RESOLVE_PENDING', choice: { kind: 'BOO_VICTIM', targetId: 'P2' } },
    )
    expect(s.players[0].coins).toBe(START_COINS + 10)
    expect(s.players[1].coins).toBe(0)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    s = walk(s)
    expect(s.players[0].currentSpaceId).toBe('s29')
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
    expect(s.itemUsedThisTurn).toBe(true)
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
    s = quickTurn(s) // P1 finit son tour
    expect(s.currentPlayerIndex).toBe(1)
    s = reduce(
      s,
      { type: 'DEBUG_FORCE_ROLL', value: 5 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
    )
    expect(s.dice?.steps).toBe(3)
    expect(s.dice?.modifierLabel).toContain('poison')
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

  it('le Coinado vole entre 5 et 10 pièces', () => {
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

    // cible sans item : action ignorée
    let s2 = start()
    s2 = gameReducer(s2, { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'FLY_GUY_TICKET' })
    const before = s2
    s2 = gameReducer(s2, { type: 'USE_ITEM', itemId: 'FLY_GUY_TICKET', targetId: 'P2' })
    expect(s2).toBe(before)
  })

  it('le tuyau doré téléporte juste avant l’Étoile', () => {
    let s = start()
    s = { ...s, starSpaceId: 's10' }
    s = reduce(
      s,
      { type: 'DEBUG_INJECT_ITEM', playerId: 'P1', itemId: 'GOLDEN_PIPE' },
      { type: 'USE_ITEM', itemId: 'GOLDEN_PIPE' },
    )
    expect(s.players[0].currentSpaceId).toBe(PREV['s10'][0])
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
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's11' },
      { type: 'DEBUG_FORCE_ROLL', value: 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.pending?.kind).toBe('TREE_GOOD_CHOICE')
    // Fruit Pièces
    const coinBranch = gameReducer(s, {
      type: 'RESOLVE_PENDING',
      choice: { kind: 'TREE_GOOD', pick: 'COIN_FRUIT' },
    })
    expect(coinBranch.players[0].coins).toBe(START_COINS + 5)
    // Fruit Dé : relance immédiate
    const diceBranch = gameReducer(s, {
      type: 'RESOLVE_PENDING',
      choice: { kind: 'TREE_GOOD', pick: 'DICE_FRUIT' },
    })
    expect(diceBranch.phase).toBe('ROLLING')
    expect(diceBranch.dice?.blockId).toBe('NORMAL')
  })

  it('l’arbre maudit fait perdre des pièces ou reculer', () => {
    let s = start()
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's20' },
      { type: 'DEBUG_FORCE_ROLL', value: 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.phase).toBe('SPACE_ACTION')
    expect(s.pending?.kind).toBe('POPUP')
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'DISMISS' } })
    if (s.movement) {
      // branche recul : on remonte le graphe puis on résout la case d'arrivée
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
    s = { ...s, starSpaceId: 's17' }
    s = reduce(
      s,
      { type: 'DEBUG_TELEPORT', playerId: 'P1', spaceId: 's26' },
      { type: 'DEBUG_FORCE_ROLL', value: 1 },
      { type: 'ROLL_DICE', blockId: 'NORMAL' },
      { type: 'DICE_LANDED' },
    )
    s = walk(s)
    expect(s.pending?.kind).toBe('VS_WAGER')
    const amount = s.pending?.kind === 'VS_WAGER' ? s.pending.amount : 0
    expect([...VS_WAGERS]).toContain(amount)
    s = gameReducer(s, { type: 'RESOLVE_PENDING', choice: { kind: 'VS_OK' } })
    const wager = Math.min(amount, START_COINS)
    const pot = wager * 4
    expect(s.minigame?.context).toBe('VS')
    expect(s.minigame?.pot).toBe(pot)
    expect(s.minigame?.category).toBe('FFA')
    expect(s.phase).toBe('MINIGAME_TITLE')
    expect(s.vsConvertedIds).toContain('s27')
    expect(effectiveSpaceType(s, 's27')).toBe('BLUE')

    s = reduce(
      s,
      { type: 'SPIN_TITLE' },
      { type: 'GO_PLAY' },
      { type: 'GO_PODIUM' },
      { type: 'SET_PODIUM', ranking: ['P1', 'P2', 'P3', 'P4'] },
    )
    expect(s.phase).toBe('REWARDS')
    const coinsAfter = s.players.reduce((acc, p) => acc + p.coins, 0)
    expect(coinsAfter).toBe(4 * START_COINS) // le pot est intégralement redistribué
    expect(s.players[0].coins).toBeGreaterThan(s.players[3].coins)
    // pas de dés de récompense pour un VS
    expect(s.players.every((p) => p.rewardDice === null)).toBe(true)

    s = gameReducer(s, { type: 'CONTINUE' })
    expect(s.phase).toBe('TURN_END')
  })
})

describe('fin de manche : minijeu, podium, récompenses', () => {
  it('après les 4 tours, la roulette se déclenche et le podium récompense', () => {
    let s = start()
    s = quickTurn(s) // P1
    s = quickTurn(s) // P2
    s = quickTurn(s) // P3
    s = quickTurn(s) // P4 → minijeu
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

    // classement invalide refusé
    const before = s
    s = gameReducer(s, { type: 'SET_PODIUM', ranking: ['P1', 'P1', 'P3', 'P4'] })
    expect(s).toBe(before)

    s = gameReducer(s, { type: 'SET_PODIUM', ranking: ['P2', 'P1', 'P3', 'P4'] })
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
    expect(s.phase).toBe('TURN_START')
    expect(s.round).toBe(2)
    expect(s.currentPlayerIndex).toBe(0)
  })

  it('le dé de récompense est imposé au lancer suivant', () => {
    let s = start()
    for (let i = 0; i < 4; i++) s = quickTurn(s)
    s = reduce(
      s,
      { type: 'SPIN_CATEGORY' },
      { type: 'SPIN_TITLE' },
      { type: 'GO_PLAY' },
      { type: 'GO_PODIUM' },
      { type: 'SET_PODIUM', ranking: ['P1', 'P2', 'P3', 'P4'] },
      { type: 'CONTINUE' },
    )
    // P1 a le dé Or : son prochain lancer roule 4-10
    s = gameReducer(s, { type: 'ROLL_DICE', blockId: 'NORMAL' })
    expect(s.dice?.blockId).toBe('GOLD')
    expect(s.dice?.steps).toBeGreaterThanOrEqual(4)
    expect(s.dice?.steps).toBeLessThanOrEqual(10)
    expect(s.players[0].rewardDice).toBeNull()
  })

  it('la partie se termine après la dernière manche (étoiles puis pièces)', () => {
    let s = start(1)
    for (let i = 0; i < 4; i++) s = quickTurn(s)
    s = reduce(
      s,
      { type: 'SPIN_CATEGORY' },
      { type: 'SPIN_TITLE' },
      { type: 'GO_PLAY' },
      { type: 'GO_PODIUM' },
      { type: 'DEBUG_EDIT_STATS', playerId: 'P3', patch: { stars: 2 } },
      { type: 'SET_PODIUM', ranking: ['P1', 'P2', 'P3', 'P4'] },
      { type: 'CONTINUE' },
    )
    expect(s.phase).toBe('GAME_OVER')
    expect(s.winners).toEqual(['P3'])
  })
})

describe('God Mode (DebugMode.md)', () => {
  it('déclenche la phase minijeu instantanément', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_TRIGGER_MINIGAME' })
    expect(s.phase).toBe('MINIGAME_CATEGORY')
    expect(s.minigame?.context).toBe('ROUND_END')
  })

  it('téléporte, injecte des items et édite les stats avec clamp', () => {
    let s = start()
    s = gameReducer(s, { type: 'DEBUG_TELEPORT', playerId: 'P2', spaceId: 'i05' })
    expect(s.players[1].currentSpaceId).toBe('i05')

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
