// ============================================================
// reducer.ts — Le moteur de jeu : un reducer pur (testable sans
// React ni 3D). Les composants ne font que dispatcher des actions
// et animer ce que le reducer a déjà décidé.
// ============================================================

import {
  BAD_LUCK_COINS,
  BOO_STEAL_COINS,
  DEFAULT_ROUNDS,
  DICE_BLOCKS,
  HIDDEN_BLOCK_COINS,
  HIDDEN_BLOCK_STAR_CHANCE,
  KAMEK_BACK_MAX,
  KAMEK_BACK_MIN,
  KAMEK_GIVE_COINS,
  KAMEK_SIPS,
  ITEMS,
  ITEM_POOL,
  LUCKY_COINS,
  MAX_INVENTORY,
  MINIGAME_CATEGORIES,
  MOLE_COST_MAX,
  MOLE_COST_MIN,
  PODIUM_LAYOUTS,
  START_COINS,
  TREE_BAD_BACK_MAX,
  TREE_BAD_BACK_MIN,
  TREE_BAD_COINS,
  TREE_COIN_FRUIT,
  VS_SPLIT,
  VS_WAGERS,
  defaultGameConfig,
} from './constants'
import {
  BOARD,
  PREV,
  SIGNPOST_FORK_IDS,
  STAR_SPOTS,
  START_SPACE_ID,
  WALL_SPACE_IDS,
  getSpace,
} from './board'
import { pickNarrative } from './eventNarratives'
import { pick, rand, randInt } from './rng'
import type {
  BadLuckOutcome,
  BoardSpace,
  DiceBlockId,
  FxEvent,
  GameAction,
  GameState,
  LogEntry,
  Player,
  PlayerId,
  PopupTone,
  SpaceType,
} from './types'

export const PLAYER_IDS: PlayerId[] = ['P1', 'P2', 'P3', 'P4']

// ---------- État initial ----------

export function createInitialState(): GameState {
  return {
    mode: 'LIVE',
    phase: 'LOBBY',
    config: defaultGameConfig(),
    round: 1,
    maxRounds: DEFAULT_ROUNDS,
    players: [],
    currentPlayerIndex: 0,
    starSpaceId: STAR_SPOTS[0],
    vsConvertedIds: [],
    signposts: {},
    walls: {},
    itemUsedThisTurn: false,
    rollBonus: 0,
    dice: null,
    movement: null,
    pending: null,
    minigame: null,
    fx: null,
    focusSpaceId: null,
    forcedRoll: null,
    log: [],
    logSeq: 0,
    winners: null,
  }
}

// ---------- Sélecteurs exportés ----------

export function getCurrentPlayer(s: GameState): Player | null {
  return s.players[s.currentPlayerIndex] ?? null
}

/** Type effectif d'une case (les VS consommées deviennent bleues, règle SMP). */
export function effectiveSpaceType(s: GameState, spaceId: string): SpaceType {
  const space = getSpace(spaceId)
  if (space.type === 'VS' && s.vsConvertedIds.includes(spaceId)) return 'BLUE'
  return space.type
}

// ---------- Helpers internes (mutent le brouillon cloné) ----------

function log(s: GameState, text: string, tone: LogEntry['tone'] = 'NEUTRAL'): void {
  s.log.push({ id: s.logSeq++, text, tone })
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80)
}

function popup(s: GameState, title: string, text: string, tone: PopupTone): void {
  s.pending = { kind: 'POPUP', title, text, tone }
}

function current(s: GameState): Player {
  const p = s.players[s.currentPlayerIndex]
  if (!p) throw new Error('Aucun joueur courant')
  return p
}

function playerById(s: GameState, id: PlayerId): Player {
  const p = s.players.find((pl) => pl.id === id)
  if (!p) throw new Error(`Joueur inconnu : ${id}`)
  return p
}

function addCoins(p: Player, delta: number): void {
  p.coins = Math.max(0, p.coins + delta)
}

function setFx(s: GameState, kind: FxEvent['kind'], from: Player, to: Player, amount?: number): void {
  s.fx = {
    id: s.logSeq++,
    kind,
    amount,
    fromName: from.name,
    toName: to.name,
    fromColor: from.color,
    toColor: to.color,
  }
}

/** Mélange (Fisher-Yates) basé sur le rng seedable. */
function shuffled<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Re-tire la direction dictée par chaque panneau (à chaque manche, règle réelle). */
function rerollSignposts(s: GameState): void {
  for (const forkId of SIGNPOST_FORK_IDS) {
    s.signposts[forkId] = randInt(0, getSpace(forkId).nextSpaces.length - 1)
  }
}

/** Reconstruit les murs à pleine solidité ([ADAPTATION] : à chaque manche). */
function resetWalls(s: GameState): void {
  for (const id of WALL_SPACE_IDS) s.walls[id] = s.config.wallStrength
}

/** Prépare un lancer : face résolue AVANT l'animation 3D. */
function prepareRoll(s: GameState, blockId: DiceBlockId): void {
  const p = current(s)
  const block = DICE_BLOCKS[blockId]
  let faceIndex: number
  let steps: number
  let faceCoins: number
  if (s.forcedRoll !== null) {
    const forced = s.forcedRoll
    const exact = block.faces.findIndex((f) => f.value === forced)
    faceIndex =
      exact >= 0
        ? exact
        : block.faces.reduce(
            (best, f, i) =>
              Math.abs(f.value - forced) < Math.abs(block.faces[best].value - forced) ? i : best,
            0,
          )
    steps = forced
    faceCoins = 0
    s.forcedRoll = null
  } else {
    faceIndex = randInt(0, 5)
    const face = block.faces[faceIndex]
    steps = face.value
    faceCoins = face.coins ?? 0
  }
  const labels: string[] = []
  let total = steps
  // Dé BONUS du podium : lancé automatiquement EN PLUS du dé principal
  // (pas une option). Consommé à l'usage. Ignoré si lancer forcé (debug /
  // dé truqué) pour garder un total prévisible — le bonus est conservé.
  let bonus: NonNullable<GameState['dice']>['bonus'] = null
  if (p.rewardDice && s.forcedRoll === null) {
    const bonusBlock = DICE_BLOCKS[p.rewardDice]
    const bonusIndex = randInt(0, 5)
    bonus = {
      blockId: p.rewardDice,
      faceIndex: bonusIndex,
      faceValue: bonusBlock.faces[bonusIndex].value,
    }
    total += bonus.faceValue
    labels.push(`+${bonus.faceValue} ${bonusBlock.label}`)
    log(s, `🎁 ${p.name} lance aussi son ${bonusBlock.label} : +${bonus.faceValue} !`, 'GOOD')
    p.rewardDice = null
  }
  if (s.rollBonus > 0) {
    total += s.rollBonus
    labels.push(`+${s.rollBonus} champignon`)
  }
  if (p.poisoned) {
    total -= 2
    labels.push('-2 poison')
    p.poisoned = false
  }
  total = Math.max(0, total)
  s.dice = {
    blockId,
    faceIndex,
    faceValue: block.faces[faceIndex].value,
    steps: total,
    faceCoins,
    modifierLabel: labels.length > 0 ? labels.join(' · ') : null,
    bonus,
  }
  s.phase = 'ROLLING'
}

/**
 * Calcule le prochain saut. Aux forks à PANNEAU, la direction est
 * dictée (règle réelle de Woody Woods) ; aux forks libres, le joueur choisit.
 */
function advanceMovement(s: GameState): void {
  const p = current(s)
  const m = s.movement
  if (!m) return
  const candidates = m.backward ? PREV[p.currentSpaceId] : getSpace(p.currentSpaceId).nextSpaces
  if (candidates.length === 0) {
    landOnSpace(s)
    return
  }
  if (!m.backward && candidates.length > 1) {
    // Pas de demi-tour immédiat sur les tronçons bidirectionnels :
    // la case d'où l'on vient est exclue des options.
    const options = candidates.filter((c) => c !== m.cameFrom)
    if (options.length <= 1) {
      m.hopTo = options[0] ?? candidates[0]
      s.phase = 'MOVING'
      return
    }
    const dictated = s.signposts[p.currentSpaceId]
    if (dictated !== undefined) {
      const target = candidates[dictated % candidates.length]
      // le panneau dicte, sauf s'il pointe pile d'où l'on vient
      if (options.includes(target)) {
        m.hopTo = target
        s.phase = 'MOVING'
        log(s, `🪧 Le panneau dirige ${p.name} !`, 'NEUTRAL')
        return
      }
    }
    m.hopTo = null
    s.phase = 'FORK_CHOICE'
    return
  }
  m.hopTo = candidates.length > 1 ? pick(candidates) : candidates[0]
  s.phase = 'MOVING'
}

/** Après un événement de passage : continuer la route ou atterrir. */
function continueOrLand(s: GameState): void {
  const m = s.movement
  if (!m) {
    landOnSpace(s)
    return
  }
  if (m.remaining > 0) advanceMovement(s)
  else landOnSpace(s)
}

/** Résolution de la case d'arrivée (effets wiki SMP + gorgées custom). */
function landOnSpace(s: GameState): void {
  const p = current(s)
  const wasBackward = s.movement?.backward ?? false
  s.movement = null
  const space = getSpace(p.currentSpaceId)
  const type = effectiveSpaceType(s, space.id)
  s.phase = 'SPACE_ACTION'
  switch (type) {
    case 'START':
      popup(s, '🏁 Case Départ', pickNarrative('START', { name: p.name }), 'NEUTRAL')
      break
    case 'BLUE':
      addCoins(p, s.config.blueCoins)
      log(s, `${p.name} gagne ${s.config.blueCoins} pièces (case bleue)`, 'GOOD')
      popup(s, '🔵 Case Bleue', pickNarrative('BLUE', { name: p.name, amount: s.config.blueCoins }), 'GOOD')
      break
    case 'RED':
      addCoins(p, -s.config.redCoins)
      log(s, `${p.name} perd ${s.config.redCoins} pièces (case rouge)`, 'BAD')
      popup(s, '🔴 Case Rouge', pickNarrative('RED', { name: p.name, amount: s.config.redCoins }), 'BAD')
      break
    case 'ITEM': {
      if (p.inventory.length >= MAX_INVENTORY) {
        popup(s, '🍄 Case Item', pickNarrative('ITEM_FULL', { name: p.name }), 'NEUTRAL')
      } else {
        const itemId = pick(ITEM_POOL)
        p.inventory.push(itemId)
        const item = ITEMS[itemId]
        log(s, `${p.name} obtient ${item.emoji} ${item.name}`, 'GOOD')
        popup(s, '🍄 Case Item', pickNarrative('ITEM_GET', { name: p.name, item: `${item.emoji} ${item.name}` }), 'GOOD')
      }
      break
    }
    case 'LUCKY': {
      // wiki SMP : la roulette fait gagner des items ou des pièces
      if (p.inventory.length >= MAX_INVENTORY || rand() < 0.5) {
        const amount = pick(LUCKY_COINS)
        addCoins(p, amount)
        log(s, `${p.name} gagne ${amount} pièces (case chance)`, 'GOOD')
        popup(s, '🍀 Case Chance', pickNarrative('LUCKY_COINS', { name: p.name, amount }), 'GOOD')
      } else {
        const itemId = pick(ITEM_POOL)
        p.inventory.push(itemId)
        const item = ITEMS[itemId]
        log(s, `${p.name} gagne ${item.emoji} ${item.name} (case chance)`, 'GOOD')
        popup(s, '🍀 Case Chance', pickNarrative('LUCKY_ITEM', { name: p.name, item: `${item.emoji} ${item.name}` }), 'GOOD')
      }
      break
    }
    case 'BAD_LUCK': {
      // LA ROUE DE KAMEK : le sort est tiré ICI par le moteur ; la
      // roulette à l'écran ne fait que le révéler avec du suspense.
      const others = s.players.filter((pl) => pl.id !== p.id)
      const options: BadLuckOutcome[] = [
        { kind: 'LOSE_COINS', amount: pick(BAD_LUCK_COINS) },
        p.inventory.length > 0
          ? { kind: 'LOSE_ITEM', index: randInt(0, p.inventory.length - 1) }
          : { kind: 'LOSE_COINS', amount: pick(BAD_LUCK_COINS) },
        { kind: 'GIVE_COINS', targetId: pick(others).id, amount: KAMEK_GIVE_COINS },
        { kind: 'SIPS', amount: KAMEK_SIPS },
        { kind: 'BACK', steps: randInt(KAMEK_BACK_MIN, KAMEK_BACK_MAX) },
      ]
      s.focusSpaceId = space.id
      s.pending = { kind: 'BAD_LUCK_WHEEL', options, resultIndex: randInt(0, options.length - 1) }
      break
    }
    case 'VS': {
      const amount = pick(VS_WAGERS)
      s.pending = { kind: 'VS_WAGER', amount }
      break
    }
    case 'SIP_PLUS':
      p.sipsTaken += s.config.sipPlus
      setFx(s, 'SIPS', p, p, s.config.sipPlus)
      log(s, `${p.name} boit ${s.config.sipPlus} gorgées !`, 'BAD')
      popup(s, '🍺 Case Gorgées', pickNarrative('SIP_PLUS', { name: p.name, amount: s.config.sipPlus }), 'BAD')
      break
    case 'SIP_MINUS':
      s.pending = { kind: 'CHOOSE_SIP_TARGET', sips: s.config.sipMinus }
      break
    case 'EVENT':
      resolveEvent(s, space, wasBackward)
      break
  }
}

function resolveEvent(s: GameState, space: BoardSpace, wasBackward: boolean): void {
  const p = current(s)
  switch (space.event) {
    case 'TREE_GOOD':
      s.focusSpaceId = space.id
      s.pending = { kind: 'TREE_GOOD_CHOICE' }
      break
    case 'TREE_BAD': {
      // Doc Woody Woods : perdre des pièces OU un dé qui fait reculer
      // (et la case d'arrivée s'active). Pas de recul en chaîne.
      s.focusSpaceId = space.id
      if (wasBackward || rand() < 0.5) {
        addCoins(p, -TREE_BAD_COINS)
        log(s, `${p.name} perd ${TREE_BAD_COINS} pièces (arbre maudit)`, 'BAD')
        popup(s, '🌳 Arbre maudit', pickNarrative('TREE_BAD_COINS', { name: p.name, amount: TREE_BAD_COINS }), 'BAD')
      } else {
        const back = randInt(TREE_BAD_BACK_MIN, TREE_BAD_BACK_MAX)
        s.movement = { remaining: back, total: back, hopTo: null, backward: true, cameFrom: null }
        log(s, `${p.name} recule de ${back} case(s) (arbre maudit)`, 'BAD')
        popup(s, '🌳 Arbre maudit', pickNarrative('TREE_BAD_BACK', { name: p.name, amount: back }), 'BAD')
      }
      break
    }
    case 'SIGNPOST': {
      // Doc Woody Woods : atterrir devant un panneau le fait pivoter
      // (il changera de toute façon encore au début de la manche suivante).
      const forkId = space.nextSpaces[0]
      s.focusSpaceId = forkId
      const branches = getSpace(forkId).nextSpaces.length
      s.signposts[forkId] = ((s.signposts[forkId] ?? 0) + 1) % branches
      log(s, 'Le panneau voisin pivote !', 'NEUTRAL')
      popup(s, '🪧 Panneau', pickNarrative('SIGNPOST'), 'NEUTRAL')
      break
    }
    case 'PIT': {
      p.trapped = true
      s.focusSpaceId = space.id
      setFx(s, 'PIT_FALL', p, p)
      log(s, `🕳️ ${p.name} tombe dans le trou !`, 'BAD')
      popup(
        s,
        '🕳️ LE TROU',
        `${pickNarrative('PIT', { name: p.name })} (Lancer ≥ ${s.config.pitEscapeMin} pour sortir.)`,
        'BAD',
      )
      break
    }
    default:
      popup(s, '❔ Événement', 'Il ne se passe rien… pour cette fois.', 'NEUTRAL')
  }
}

function finishGame(s: GameState): void {
  let best: Player[] = []
  for (const p of s.players) {
    if (best.length === 0) {
      best = [p]
      continue
    }
    const b = best[0]
    if (p.stars > b.stars || (p.stars === b.stars && p.coins > b.coins)) best = [p]
    else if (p.stars === b.stars && p.coins === b.coins) best.push(p)
  }
  s.winners = best.map((p) => p.id)
  s.phase = 'GAME_OVER'
  log(s, 'Fin de partie !', 'SYSTEM')
}

// ---------- Le reducer ----------

export function gameReducer(state: GameState, action: GameAction): GameState {
  const s = structuredClone(state)

  switch (action.type) {
    // ----- Lobby -----
    case 'START_GAME': {
      if (action.players.length !== PLAYER_IDS.length) return state
      const fresh = createInitialState()
      fresh.mode = state.mode
      fresh.config = structuredClone(s.config)
      fresh.maxRounds = action.maxRounds
      fresh.players = action.players.map((cfg, i) => ({
        id: PLAYER_IDS[i],
        name: cfg.name.trim() || `Joueur ${i + 1}`,
        color: cfg.color,
        character: cfg.character,
        currentSpaceId: START_SPACE_ID,
        avatarUrl: cfg.avatarUrl ?? null,
        inventory: [],
        coins: START_COINS,
        stars: 0,
        sipsTaken: 0,
        sipsGiven: 0,
        rewardDice: null,
        poisoned: false,
        trapped: false,
      }))
      fresh.starSpaceId = pick(STAR_SPOTS)
      rerollSignposts(fresh)
      resetWalls(fresh)
      fresh.phase = 'TURN_START'
      fresh.logSeq = s.logSeq
      log(fresh, `La partie commence ! ${fresh.players[0].name} ouvre le bal.`, 'SYSTEM')
      return fresh
    }

    // ----- Pré-roll : item -----
    case 'USE_ITEM': {
      if (s.phase !== 'TURN_START' || s.itemUsedThisTurn) return state
      const p = current(s)
      const idx = p.inventory.indexOf(action.itemId)
      if (idx < 0) return state
      const item = ITEMS[action.itemId]
      let target: Player | null = null
      if (item.needsTarget) {
        if (!action.targetId || action.targetId === p.id) return state
        target = playerById(s, action.targetId)
        if (action.itemId === 'FLY_GUY_TICKET' && target.inventory.length === 0) return state
        if (action.itemId === 'COINADO' && target.coins === 0) return state
      }
      p.inventory.splice(idx, 1)
      s.itemUsedThisTurn = true
      log(s, `${p.name} utilise ${item.emoji} ${item.name}`, 'NEUTRAL')
      switch (action.itemId) {
        case 'DASH_MUSHROOM':
          s.rollBonus += 3
          popup(s, '🍄 Champignon', pickNarrative('ITEM_MUSHROOM', { name: p.name }), 'GOOD')
          break
        case 'GOLDEN_DASH_MUSHROOM':
          s.rollBonus += 5
          popup(s, '✨ Champignon doré', pickNarrative('ITEM_GOLDEN_MUSHROOM', { name: p.name }), 'GOOD')
          break
        case 'POISON_MUSHROOM':
          target!.poisoned = true
          popup(s, '☠️ Champignon poison', pickNarrative('ITEM_POISON', { name: p.name, target: target!.name }), 'GOOD')
          break
        case 'CUSTOM_DICE_BLOCK': {
          const value = Math.min(6, Math.max(1, Math.round(action.value ?? 1)))
          s.forcedRoll = value
          popup(s, '🎯 Dé truqué', pickNarrative('ITEM_RIGGED_DICE', { name: p.name, value }), 'GOOD')
          break
        }
        case 'COINADO': {
          const amount = Math.min(randInt(5, 10), target!.coins)
          target!.coins -= amount
          p.coins += amount
          setFx(s, 'STEAL_COINS', target!, p, amount)
          log(s, `${p.name} vole ${amount} pièces à ${target!.name} (Coinado)`, 'GOOD')
          popup(s, '🌪️ Coinado', pickNarrative('ITEM_COINADO', { name: p.name, target: target!.name, amount }), 'GOOD')
          break
        }
        case 'FLY_GUY_TICKET': {
          const stolenIdx = randInt(0, target!.inventory.length - 1)
          const [stolen] = target!.inventory.splice(stolenIdx, 1)
          p.inventory.push(stolen)
          const stolenItem = ITEMS[stolen]
          log(s, `${p.name} vole ${stolenItem.emoji} ${stolenItem.name} à ${target!.name}`, 'GOOD')
          popup(s, '🎫 Maskache ailé', pickNarrative('ITEM_FLY_GUY', { name: p.name, target: target!.name, item: `${stolenItem.emoji} ${stolenItem.name}` }), 'GOOD')
          break
        }
        case 'GOLDEN_PIPE': {
          const before = PREV[s.starSpaceId][0] ?? s.starSpaceId
          p.currentSpaceId = before
          p.trapped = false
          log(s, `${p.name} surgit du tuyau doré près de l'Étoile`, 'GOOD')
          popup(s, '🪈 Tuyau doré', pickNarrative('ITEM_GOLDEN_PIPE', { name: p.name }), 'GOOD')
          break
        }
        case 'HIDDEN_BLOCK_CARD': {
          if (rand() < HIDDEN_BLOCK_STAR_CHANCE) {
            p.stars += 1
            log(s, `${p.name} trouve une ÉTOILE dans le bloc caché !!`, 'GOOD')
            popup(s, '🎁 Bloc caché', pickNarrative('ITEM_HIDDEN_BLOCK_STAR', { name: p.name }), 'GOOD')
          } else {
            addCoins(p, HIDDEN_BLOCK_COINS)
            log(s, `${p.name} trouve ${HIDDEN_BLOCK_COINS} pièces dans le bloc caché`, 'GOOD')
            popup(s, '🎁 Bloc caché', pickNarrative('ITEM_HIDDEN_BLOCK_COINS', { name: p.name, amount: HIDDEN_BLOCK_COINS }), 'GOOD')
          }
          break
        }
      }
      return s
    }

    // ----- Lancer de dé -----
    case 'ROLL_DICE': {
      if (s.phase !== 'TURN_START') return state
      const p = current(s)
      // dé normal ou dé perso ; le dé de récompense est lancé en PLUS,
      // automatiquement, par prepareRoll
      const allowed: DiceBlockId[] = ['NORMAL', p.character]
      if (!allowed.includes(action.blockId)) return state
      s.focusSpaceId = null
      prepareRoll(s, action.blockId)
      return s
    }

    case 'DICE_LANDED': {
      if (s.phase !== 'ROLLING' || !s.dice) return state
      const p = current(s)
      const d = s.dice
      if (d.faceCoins !== 0) {
        addCoins(p, d.faceCoins)
        log(
          s,
          `${p.name} ${d.faceCoins > 0 ? 'gagne' : 'perd'} ${Math.abs(d.faceCoins)} pièces (face du dé)`,
          d.faceCoins > 0 ? 'GOOD' : 'BAD',
        )
      }
      s.rollBonus = 0
      if (d.steps === 0) {
        log(s, `${p.name} fait 0 et reste sur place !`, 'BAD')
        s.phase = 'TURN_END'
        return s
      }
      // Le trou : il faut un lancer suffisant pour s'en extirper
      if (p.trapped) {
        if (d.steps < s.config.pitEscapeMin) {
          log(s, `🕳️ ${p.name} reste coincé dans le trou (${d.steps} < ${s.config.pitEscapeMin})`, 'BAD')
          s.phase = 'SPACE_ACTION'
          popup(
            s,
            '🕳️ Toujours coincé !',
            pickNarrative('PIT_STUCK', { name: p.name, roll: d.steps, needed: s.config.pitEscapeMin }),
            'BAD',
          )
          return s
        }
        p.trapped = false
        s.movement = { remaining: d.steps, total: d.steps, hopTo: null, backward: false, cameFrom: null }
        s.phase = 'SPACE_ACTION'
        log(s, `💪 ${p.name} s'extirpe du trou avec un ${d.steps} !`, 'GOOD')
        popup(s, '💪 LIBÉRÉ !', pickNarrative('PIT_ESCAPE', { name: p.name, roll: d.steps }), 'GOOD')
        return s
      }
      s.movement = { remaining: d.steps, total: d.steps, hopTo: null, backward: false, cameFrom: null }
      advanceMovement(s)
      return s
    }

    // ----- Déplacement -----
    case 'STEP_DONE': {
      if (s.phase !== 'MOVING' || !s.movement?.hopTo) return state
      const p = current(s)
      const m = s.movement
      m.cameFrom = p.currentSpaceId
      p.currentSpaceId = m.hopTo!
      m.hopTo = null
      m.remaining -= 1
      if (!m.backward) {
        const arrived = getSpace(p.currentSpaceId)
        // Le mur : tentative basée sur le lancer du tour
        const wallStrength = s.walls[p.currentSpaceId] ?? 0
        if (arrived.wall && wallStrength > 0) {
          const roll = s.dice?.steps ?? 0
          s.phase = 'PASS_EVENT'
          if (roll >= wallStrength) {
            s.walls[p.currentSpaceId] = 0
            setFx(s, 'WALL_BREAK', p, p, roll)
            log(s, `💥 ${p.name} CASSE le mur (lancer ${roll} ≥ ${wallStrength}) !`, 'GOOD')
            popup(
              s,
              '💥 MUR CASSÉ !',
              `Ton lancer de ${roll} pulvérise le mur (il fallait ≥ ${wallStrength}) ! La voie est libre pour tout le monde.`,
              'GOOD',
            )
          } else {
            s.walls[p.currentSpaceId] = wallStrength - 1
            m.remaining = 0
            log(s, `🧱 ${p.name} bute sur le mur (${roll} < ${wallStrength}) — il s'effrite : ${wallStrength - 1}`, 'BAD')
            popup(
              s,
              '🧱 BLOQUÉ !',
              `Le mur tient (il fallait ≥ ${wallStrength}, lancer : ${roll}). Il s'effrite : prochaine tentative à ${wallStrength - 1}.`,
              'BAD',
            )
          }
          return s
        }
        if (p.currentSpaceId === s.starSpaceId) {
          s.phase = 'PASS_EVENT'
          s.focusSpaceId = p.currentSpaceId
          s.pending = { kind: 'STAR_PROMPT' }
          return s
        }
        if (arrived.hasBoo) {
          s.phase = 'PASS_EVENT'
          s.focusSpaceId = p.currentSpaceId
          s.pending = { kind: 'BOO_PROMPT' }
          return s
        }
        if (arrived.hasMole) {
          s.phase = 'PASS_EVENT'
          s.focusSpaceId = p.currentSpaceId
          s.pending = { kind: 'MOLE_PROMPT', cost: randInt(MOLE_COST_MIN, MOLE_COST_MAX) }
          return s
        }
      }
      continueOrLand(s)
      return s
    }

    case 'CHOOSE_FORK': {
      if (s.phase !== 'FORK_CHOICE' || !s.movement) return state
      const p = current(s)
      const candidates = getSpace(p.currentSpaceId).nextSpaces
      if (!candidates.includes(action.nextSpaceId)) return state
      s.movement.hopTo = action.nextSpaceId
      s.phase = 'MOVING'
      return s
    }

    // ----- Résolution des popups / choix -----
    case 'RESOLVE_PENDING': {
      const pending = s.pending
      if (!pending) return state
      const p = current(s)
      s.pending = null
      s.focusSpaceId = null
      const choice = action.choice
      switch (choice.kind) {
        case 'DISMISS': {
          if (s.phase === 'PASS_EVENT') {
            continueOrLand(s)
          } else if (s.phase === 'SPACE_ACTION') {
            if (s.movement && s.movement.remaining > 0) advanceMovement(s)
            else s.phase = 'TURN_END'
          }
          // en TURN_START (popup d'item) : on reste simplement sur place
          return s
        }
        case 'SIP_TARGET': {
          const sips = pending.kind === 'CHOOSE_SIP_TARGET' ? pending.sips : s.config.sipMinus
          const target = playerById(s, choice.targetId)
          if (target.id === p.id) return state
          target.sipsTaken += sips
          p.sipsGiven += sips
          setFx(s, 'SIPS', p, target, sips)
          log(s, `${p.name} distribue ${sips} gorgées à ${target.name} !`, 'GOOD')
          popup(s, '🍻 Distribution', pickNarrative('SIP_DISTRIBUTE', { from: p.name, to: target.name, amount: sips }), 'GOOD')
          return s
        }
        case 'TREE_GOOD': {
          if (choice.pick === 'COIN_FRUIT') {
            addCoins(p, TREE_COIN_FRUIT)
            log(s, `${p.name} croque le Fruit Pièces : +${TREE_COIN_FRUIT} pièces`, 'GOOD')
            popup(s, '🌳 Arbre généreux', pickNarrative('TREE_GOOD_COINS', { name: p.name, amount: TREE_COIN_FRUIT }), 'GOOD')
          } else {
            log(s, `${p.name} croque le Fruit Dé et relance !`, 'GOOD')
            prepareRoll(s, 'NORMAL')
          }
          return s
        }
        case 'BOO': {
          if (choice.action === 'STEAL_COINS') {
            s.pending = { kind: 'BOO_PICK_VICTIM', steal: 'COINS' }
          } else if (choice.action === 'STEAL_STAR') {
            if (p.coins < s.config.booStarCost) {
              popup(s, '👻 Boo', `Il faut ${s.config.booStarCost} pièces pour voler une Étoile…`, 'NEUTRAL')
            } else {
              addCoins(p, -s.config.booStarCost)
              s.pending = { kind: 'BOO_PICK_VICTIM', steal: 'STAR' }
            }
          } else {
            continueOrLand(s)
          }
          return s
        }
        case 'BOO_VICTIM': {
          const steal = pending.kind === 'BOO_PICK_VICTIM' ? pending.steal : 'COINS'
          const target = playerById(s, choice.targetId)
          if (target.id === p.id) return state
          if (steal === 'COINS') {
            const amount = Math.min(BOO_STEAL_COINS, target.coins)
            target.coins -= amount
            p.coins += amount
            setFx(s, 'STEAL_COINS', target, p, amount)
            log(s, `Boo vole ${amount} pièces à ${target.name} pour ${p.name} !`, 'GOOD')
            popup(s, '👻 Boo', pickNarrative('BOO_STEAL_COINS', { name: p.name, target: target.name, amount }), 'GOOD')
          } else if (target.stars > 0) {
            target.stars -= 1
            p.stars += 1
            setFx(s, 'STEAL_STAR', target, p)
            log(s, `Boo vole une ÉTOILE à ${target.name} pour ${p.name} !!`, 'GOOD')
            popup(s, '👻 Boo', pickNarrative('BOO_STEAL_STAR', { name: p.name, target: target.name }), 'GOOD')
          } else {
            addCoins(p, s.config.booStarCost)
            popup(s, '👻 Boo', `${target.name} n'a pas d'Étoile. Boo te rembourse.`, 'NEUTRAL')
          }
          return s
        }
        case 'STAR': {
          if (choice.buy && p.coins >= s.config.starCost) {
            addCoins(p, -s.config.starCost)
            p.stars += 1
            setFx(s, 'STAR_BUY', p, p)
            const others = STAR_SPOTS.filter((id) => id !== s.starSpaceId)
            s.starSpaceId = pick(others)
            log(s, `⭐ ${p.name} achète une Étoile ! Toadette déménage…`, 'GOOD')
            popup(s, '⭐ Étoile !', pickNarrative('STAR_BUY', { name: p.name, cost: s.config.starCost }), 'GOOD')
          } else {
            continueOrLand(s)
          }
          return s
        }
        case 'VS_OK': {
          const amount = pending.kind === 'VS_WAGER' ? pending.amount : VS_WAGERS[0]
          let pot = 0
          for (const pl of s.players) {
            const wager = Math.min(amount, pl.coins)
            pl.coins -= wager
            pot += wager
          }
          s.vsConvertedIds.push(p.currentSpaceId)
          s.minigame = { context: 'VS', pot, category: 'FFA', title: null, groups: null, teams: null }
          s.phase = 'MINIGAME_TITLE'
          log(s, `Case VS : ${pot} pièces dans le pot !`, 'SYSTEM')
          return s
        }
        case 'BAD_LUCK_DONE': {
          if (pending.kind !== 'BAD_LUCK_WHEEL') return state
          const outcome = pending.options[pending.resultIndex]
          switch (outcome.kind) {
            case 'LOSE_COINS': {
              addCoins(p, -outcome.amount)
              log(s, `🔮 Kamek : ${p.name} perd ${outcome.amount} pièces`, 'BAD')
              popup(s, '🔮 Roue de Kamek', pickNarrative('BAD_LUCK_COINS', { name: p.name, amount: outcome.amount }), 'BAD')
              break
            }
            case 'LOSE_ITEM': {
              const [lost] = p.inventory.splice(Math.min(outcome.index, p.inventory.length - 1), 1)
              const item = lost ? ITEMS[lost] : null
              log(s, `🔮 Kamek confisque ${item ? item.name : 'un objet'} à ${p.name}`, 'BAD')
              popup(
                s,
                '🔮 Roue de Kamek',
                item
                  ? pickNarrative('BAD_LUCK_ITEM', { name: p.name, item: `${item.emoji} ${item.name}` })
                  : 'Kamek ne trouve rien à voler…',
                'BAD',
              )
              break
            }
            case 'GIVE_COINS': {
              const target = playerById(s, outcome.targetId)
              const amount = Math.min(outcome.amount, p.coins)
              p.coins -= amount
              target.coins += amount
              setFx(s, 'STEAL_COINS', p, target, amount)
              log(s, `🔮 Kamek : ${p.name} donne ${amount} pièces à ${target.name}`, 'BAD')
              popup(s, '🔮 Roue de Kamek', `Tes pièces s'envolent : ${amount} 🪙 pour ${target.name} !`, 'BAD')
              break
            }
            case 'SIPS': {
              p.sipsTaken += outcome.amount
              setFx(s, 'SIPS', p, p, outcome.amount)
              log(s, `🔮 Kamek : ${p.name} boit ${outcome.amount} gorgées`, 'BAD')
              popup(s, '🔮 Roue de Kamek', `Potion amère : bois ${outcome.amount} gorgées !`, 'BAD')
              break
            }
            case 'BACK': {
              s.movement = {
                remaining: outcome.steps,
                total: outcome.steps,
                hopTo: null,
                backward: true,
                cameFrom: null,
              }
              log(s, `🔮 Kamek souffle ${p.name} ${outcome.steps} cases en arrière`, 'BAD')
              popup(
                s,
                '🔮 Roue de Kamek',
                `Une bourrasque magique te souffle ${outcome.steps} cases en arrière !`,
                'BAD',
              )
              break
            }
          }
          return s
        }
        case 'MOLE': {
          const cost = pending.kind === 'MOLE_PROMPT' ? pending.cost : MOLE_COST_MIN
          if (choice.pay && p.coins >= cost) {
            addCoins(p, -cost)
            if (choice.directions) {
              for (const [forkId, dir] of Object.entries(choice.directions)) {
                if (SIGNPOST_FORK_IDS.includes(forkId)) {
                  const branches = getSpace(forkId).nextSpaces.length
                  s.signposts[forkId] = ((dir % branches) + branches) % branches
                }
              }
            }
            log(s, `🦫 ${p.name} paie ${cost} pièces à Topi Taupe : panneaux réorientés !`, 'NEUTRAL')
            popup(s, '🦫 Topi Taupe', 'Marché conclu ! Les panneaux pointent désormais où tu l’as décidé.', 'GOOD')
          } else {
            continueOrLand(s)
          }
          return s
        }
      }
      return s
    }

    // ----- Fin de tour -----
    case 'END_TURN': {
      if (s.phase !== 'TURN_END') return state
      s.dice = null
      s.movement = null
      s.pending = null
      s.focusSpaceId = null
      s.itemUsedThisTurn = false
      s.rollBonus = 0
      if (s.currentPlayerIndex < s.players.length - 1) {
        s.currentPlayerIndex += 1
        s.phase = 'TURN_START'
        log(s, `Au tour de ${current(s).name} !`, 'SYSTEM')
      } else {
        s.minigame = { context: 'ROUND_END', pot: 0, category: null, title: null, groups: null, teams: null }
        s.phase = 'MINIGAME_CATEGORY'
        log(s, `Fin de la manche ${s.round} — place au MINIJEU !`, 'SYSTEM')
      }
      return s
    }

    // ----- Minijeux -----
    case 'SPIN_CATEGORY': {
      if (s.phase !== 'MINIGAME_CATEGORY' || !s.minigame || s.minigame.category) return state
      const category = pick([...MINIGAME_CATEGORIES])
      s.minigame.category = category
      log(s, `Catégorie tirée : ${category} !`, 'SYSTEM')
      // Tirage AUTOMATIQUE des participants : plus de sélection manuelle.
      if (category === '1v1' || category === '2v2') {
        const order = shuffled(s.players.map((pl) => pl.id))
        s.minigame.teams =
          category === '1v1'
            ? [[order[0]], [order[1]]]
            : [
                [order[0], order[1]],
                [order[2], order[3]],
              ]
        const names = (g: PlayerId[]) => g.map((id) => playerById(s, id).name).join(' & ')
        log(
          s,
          `⚔️ Tirage : ${names(s.minigame.teams[0])} VS ${names(s.minigame.teams[1])} !`,
          'SYSTEM',
        )
      } else {
        s.minigame.teams = null
      }
      return s
    }

    case 'SPIN_TITLE': {
      if (!s.minigame || !s.minigame.category || s.minigame.title) return state
      if (s.phase !== 'MINIGAME_CATEGORY' && s.phase !== 'MINIGAME_TITLE') return state
      s.phase = 'MINIGAME_TITLE'
      s.minigame.title = pick(s.config.minigames[s.minigame.category])
      log(s, `Minijeu tiré : ${s.minigame.title} !`, 'SYSTEM')
      return s
    }

    case 'GO_PLAY': {
      if (s.phase !== 'MINIGAME_TITLE' || !s.minigame?.title) return state
      s.phase = 'MINIGAME_PLAY'
      return s
    }

    case 'GO_PODIUM': {
      if (s.phase !== 'MINIGAME_PLAY') return state
      s.phase = 'PODIUM'
      return s
    }

    case 'SET_PODIUM': {
      if (s.phase !== 'PODIUM' || !s.minigame?.category) return state
      const layout = PODIUM_LAYOUTS[s.minigame.category]
      const groups = action.groups
      if (groups.length !== layout.length) return state
      if (groups.some((g, i) => g.length !== layout[i].count)) return state
      const flat = groups.flat()
      if (flat.length !== s.players.length || new Set(flat).size !== flat.length) return state
      s.minigame.groups = groups
      if (s.minigame.context === 'VS') {
        // VS = catégorie FFA : 4 groupes de 1, l'ordre est le rang
        const pot = s.minigame.pot
        let distributed = 0
        flat.forEach((pid, i) => {
          const share = Math.floor(pot * (VS_SPLIT[i] ?? 0))
          distributed += share
          if (share > 0) {
            playerById(s, pid).coins += share
            log(s, `${playerById(s, pid).name} récupère ${share} pièces du pot VS`, 'GOOD')
          }
        })
        playerById(s, flat[0]).coins += pot - distributed
      } else {
        groups.forEach((group, i) => {
          const slot = layout[i]
          for (const pid of group) {
            const pl = playerById(s, pid)
            if (slot.dice) pl.rewardDice = slot.dice
            pl.sipsTaken += slot.sips
            log(
              s,
              `${pl.name} (${slot.label}) : ${slot.dice ? `${DICE_BLOCKS[slot.dice].label} en bonus` : 'pas de dé bonus'} · ${slot.sips} gorgée${slot.sips > 1 ? 's' : ''}`,
              slot.sips === 0 ? 'GOOD' : 'BAD',
            )
          }
        })
      }
      s.phase = 'REWARDS'
      return s
    }

    case 'CONTINUE': {
      if (s.phase !== 'REWARDS' || !s.minigame) return state
      const ctx = s.minigame.context
      s.minigame = null
      if (ctx === 'VS') {
        s.phase = 'TURN_END'
        return s
      }
      if (s.round >= s.maxRounds) {
        finishGame(s)
        return s
      }
      s.round += 1
      s.currentPlayerIndex = 0
      s.itemUsedThisTurn = false
      s.rollBonus = 0
      rerollSignposts(s) // règle réelle : les panneaux changent à chaque manche
      resetWalls(s)
      // Plan de transition : la caméra survole le plateau et un récap
      // explique les nouvelles directions des panneaux.
      s.phase = 'ROUND_INTRO'
      log(s, `Manche ${s.round}/${s.maxRounds} — panneaux re-tirés, murs reconstruits !`, 'SYSTEM')
      return s
    }

    case 'BEGIN_ROUND': {
      if (s.phase !== 'ROUND_INTRO') return state
      s.phase = 'TURN_START'
      log(s, `${current(s).name} ouvre la manche ${s.round} !`, 'SYSTEM')
      return s
    }

    case 'SET_CONFIG': {
      // Éditable au lobby, ou à chaud en mode DEBUG (God Mode)
      if (s.phase !== 'LOBBY' && s.mode !== 'DEBUG') return state
      const patch = action.patch
      const num = (v: number | undefined, fallback: number, min = 0) =>
        v === undefined || Number.isNaN(v) ? fallback : Math.max(min, Math.round(v))
      s.config = {
        blueCoins: num(patch.blueCoins, s.config.blueCoins),
        redCoins: num(patch.redCoins, s.config.redCoins),
        starCost: num(patch.starCost, s.config.starCost, 1),
        booStarCost: num(patch.booStarCost, s.config.booStarCost, 1),
        sipPlus: num(patch.sipPlus, s.config.sipPlus),
        sipMinus: num(patch.sipMinus, s.config.sipMinus),
        pitEscapeMin: num(patch.pitEscapeMin, s.config.pitEscapeMin, 1),
        wallStrength: num(patch.wallStrength, s.config.wallStrength, 1),
        minigames: patch.minigames
          ? {
              '1v1': patch.minigames['1v1'].filter(Boolean).length > 0 ? patch.minigames['1v1'].filter(Boolean) : s.config.minigames['1v1'],
              '2v2': patch.minigames['2v2'].filter(Boolean).length > 0 ? patch.minigames['2v2'].filter(Boolean) : s.config.minigames['2v2'],
              FFA: patch.minigames.FFA.filter(Boolean).length > 0 ? patch.minigames.FFA.filter(Boolean) : s.config.minigames.FFA,
            }
          : s.config.minigames,
      }
      log(s, '⚙️ Configuration mise à jour', 'SYSTEM')
      return s
    }

    case 'RESTART': {
      const fresh = createInitialState()
      fresh.mode = s.mode
      fresh.config = structuredClone(s.config)
      return fresh
    }

    // ----- God Mode (DebugMode.md + extensions) -----
    case 'DEBUG_SET_MODE': {
      s.mode = action.mode
      return s
    }

    case 'DEBUG_FORCE_ROLL': {
      s.forcedRoll = action.value === null ? null : Math.max(0, Math.round(action.value))
      if (s.forcedRoll !== null) log(s, `[DEBUG] Prochain lancer forcé à ${s.forcedRoll}`, 'SYSTEM')
      return s
    }

    case 'DEBUG_TELEPORT': {
      if (!BOARD[action.spaceId]) return state
      const pl = playerById(s, action.playerId)
      pl.currentSpaceId = action.spaceId
      pl.trapped = false
      log(s, `[DEBUG] ${pl.name} téléporté sur ${action.spaceId}`, 'SYSTEM')
      return s
    }

    case 'DEBUG_INJECT_ITEM': {
      const pl = playerById(s, action.playerId)
      if (pl.inventory.length >= MAX_INVENTORY) return state
      pl.inventory.push(action.itemId)
      log(s, `[DEBUG] ${ITEMS[action.itemId].name} injecté chez ${pl.name}`, 'SYSTEM')
      return s
    }

    case 'DEBUG_TRIGGER_MINIGAME': {
      if (s.players.length === 0) return state
      s.dice = null
      s.movement = null
      s.pending = null
      s.minigame = { context: 'ROUND_END', pot: 0, category: null, title: null, groups: null, teams: null }
      s.phase = 'MINIGAME_CATEGORY'
      log(s, '[DEBUG] Phase minijeu déclenchée', 'SYSTEM')
      return s
    }

    case 'DEBUG_EDIT_STATS': {
      const pl = playerById(s, action.playerId)
      const patch = action.patch
      if (patch.sipsTaken !== undefined) pl.sipsTaken = Math.max(0, patch.sipsTaken)
      if (patch.sipsGiven !== undefined) pl.sipsGiven = Math.max(0, patch.sipsGiven)
      if (patch.coins !== undefined) pl.coins = Math.max(0, patch.coins)
      if (patch.stars !== undefined) pl.stars = Math.max(0, patch.stars)
      log(s, `[DEBUG] Stats de ${pl.name} modifiées`, 'SYSTEM')
      return s
    }

    case 'DEBUG_SET_TURN': {
      const idx = s.players.findIndex((pl) => pl.id === action.playerId)
      if (idx < 0) return state
      s.currentPlayerIndex = idx
      s.dice = null
      s.movement = null
      s.pending = null
      s.minigame = null
      s.itemUsedThisTurn = false
      s.rollBonus = 0
      s.phase = 'TURN_START'
      log(s, `[DEBUG] C'est maintenant au tour de ${s.players[idx].name}`, 'SYSTEM')
      return s
    }

    case 'DEBUG_SET_WALL': {
      if (!BOARD[action.spaceId]?.wall) return state
      s.walls[action.spaceId] = Math.max(0, Math.round(action.strength))
      log(s, `[DEBUG] Mur ${action.spaceId} réglé à ${s.walls[action.spaceId]}`, 'SYSTEM')
      return s
    }

    case 'DEBUG_SET_TRAPPED': {
      const pl = playerById(s, action.playerId)
      pl.trapped = action.trapped
      log(s, `[DEBUG] ${pl.name} ${action.trapped ? 'piégé dans le trou' : 'libéré du trou'}`, 'SYSTEM')
      return s
    }

    case 'DEBUG_REROLL_SIGNPOSTS': {
      rerollSignposts(s)
      log(s, '[DEBUG] Panneaux re-tirés', 'SYSTEM')
      return s
    }

    default:
      return state
  }
}
