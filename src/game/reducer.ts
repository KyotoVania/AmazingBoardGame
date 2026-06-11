// ============================================================
// reducer.ts — Le moteur de jeu : un reducer pur (testable sans
// React ni 3D). Les composants ne font que dispatcher des actions
// et animer ce que le reducer a déjà décidé.
// ============================================================

import {
  BAD_LUCK_COINS,
  BLUE_COINS,
  BOO_STAR_COST,
  BOO_STEAL_COINS,
  DEFAULT_ROUNDS,
  DICE_BLOCKS,
  HIDDEN_BLOCK_COINS,
  HIDDEN_BLOCK_STAR_CHANCE,
  ITEMS,
  ITEM_POOL,
  LUCKY_COINS,
  MAX_INVENTORY,
  MINIGAME_CATEGORIES,
  MINIGAMES,
  PODIUM_REWARDS,
  RED_COINS,
  SIP_MINUS_AMOUNT,
  SIP_PLUS_AMOUNT,
  START_COINS,
  STAR_COST,
  TREE_BAD_BACK_MAX,
  TREE_BAD_BACK_MIN,
  TREE_BAD_COINS,
  TREE_COIN_FRUIT,
  VS_SPLIT,
  VS_WAGERS,
} from './constants'
import { BOARD, FORK_IDS, PREV, STAR_SPOTS, START_SPACE_ID, getSpace } from './board'
import { pick, rand, randInt } from './rng'
import type {
  BoardSpace,
  DiceBlockId,
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
    round: 1,
    maxRounds: DEFAULT_ROUNDS,
    players: [],
    currentPlayerIndex: 0,
    starSpaceId: STAR_SPOTS[0],
    vsConvertedIds: [],
    signposts: {},
    itemUsedThisTurn: false,
    rollBonus: 0,
    dice: null,
    movement: null,
    pending: null,
    minigame: null,
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

function addCoins(s: GameState, p: Player, delta: number): void {
  p.coins = Math.max(0, p.coins + delta)
}

function rerollSignposts(s: GameState): void {
  for (const forkId of FORK_IDS) {
    s.signposts[forkId] = randInt(0, getSpace(forkId).nextSpaces.length - 1)
  }
}

/** Prépare un lancer : face résolue AVANT l'animation 3D. */
function prepareRoll(s: GameState, requestedBlockId: DiceBlockId): void {
  const p = current(s)
  let blockId = requestedBlockId
  // Le dé de récompense du podium est imposé pour ce lancer.
  if (p.rewardDice) {
    blockId = p.rewardDice
    p.rewardDice = null
  }
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
  }
  s.phase = 'ROLLING'
}

/** Calcule le prochain saut, ou ouvre le choix d'embranchement. */
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
      popup(s, '🏁 Case Départ', 'Rien ne se passe ici. Profites-en pour souffler.', 'NEUTRAL')
      break
    case 'BLUE':
      addCoins(s, p, BLUE_COINS)
      log(s, `${p.name} gagne ${BLUE_COINS} pièces (case bleue)`, 'GOOD')
      popup(s, '🔵 Case Bleue', `+${BLUE_COINS} pièces !`, 'GOOD')
      break
    case 'RED':
      addCoins(s, p, -RED_COINS)
      log(s, `${p.name} perd ${RED_COINS} pièces (case rouge)`, 'BAD')
      popup(s, '🔴 Case Rouge', `-${RED_COINS} pièces…`, 'BAD')
      break
    case 'ITEM': {
      if (p.inventory.length >= MAX_INVENTORY) {
        popup(s, '🍄 Case Item', 'Inventaire plein (3 max) ! Rien à ramasser.', 'NEUTRAL')
      } else {
        const itemId = pick(ITEM_POOL)
        p.inventory.push(itemId)
        const item = ITEMS[itemId]
        log(s, `${p.name} obtient ${item.emoji} ${item.name}`, 'GOOD')
        popup(s, '🍄 Case Item', `Tu obtiens : ${item.emoji} ${item.name} !`, 'GOOD')
      }
      break
    }
    case 'LUCKY': {
      // wiki SMP : la roulette fait gagner des items ou des pièces
      if (p.inventory.length >= MAX_INVENTORY || rand() < 0.5) {
        const amount = pick(LUCKY_COINS)
        addCoins(s, p, amount)
        log(s, `${p.name} gagne ${amount} pièces (case chance)`, 'GOOD')
        popup(s, '🍀 Case Chance', `La roulette s'arrête sur +${amount} pièces !`, 'GOOD')
      } else {
        const itemId = pick(ITEM_POOL)
        p.inventory.push(itemId)
        const item = ITEMS[itemId]
        log(s, `${p.name} gagne ${item.emoji} ${item.name} (case chance)`, 'GOOD')
        popup(s, '🍀 Case Chance', `La roulette offre : ${item.emoji} ${item.name} !`, 'GOOD')
      }
      break
    }
    case 'BAD_LUCK': {
      // wiki SMP : la roue de Kamek fait perdre des items ou des pièces
      if (p.inventory.length > 0 && rand() < 0.5) {
        const idx = randInt(0, p.inventory.length - 1)
        const [lost] = p.inventory.splice(idx, 1)
        const item = ITEMS[lost]
        log(s, `${p.name} perd ${item.emoji} ${item.name} (case poisse)`, 'BAD')
        popup(s, '💀 Case Poisse', `Kamek te confisque ${item.emoji} ${item.name}…`, 'BAD')
      } else {
        const amount = pick(BAD_LUCK_COINS)
        addCoins(s, p, -amount)
        log(s, `${p.name} perd ${amount} pièces (case poisse)`, 'BAD')
        popup(s, '💀 Case Poisse', `La roue de Kamek : -${amount} pièces…`, 'BAD')
      }
      break
    }
    case 'VS': {
      const amount = pick(VS_WAGERS)
      s.pending = { kind: 'VS_WAGER', amount }
      break
    }
    case 'SIP_PLUS':
      p.sipsTaken += SIP_PLUS_AMOUNT
      log(s, `${p.name} boit ${SIP_PLUS_AMOUNT} gorgées !`, 'BAD')
      popup(s, '🍺 Case Gorgées', `Bois ${SIP_PLUS_AMOUNT} gorgées !`, 'BAD')
      break
    case 'SIP_MINUS':
      s.pending = { kind: 'CHOOSE_SIP_TARGET', sips: SIP_MINUS_AMOUNT }
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
      s.pending = { kind: 'TREE_GOOD_CHOICE' }
      break
    case 'TREE_BAD': {
      // Doc Woody Woods : perdre des pièces OU un dé qui fait reculer
      // (et la case d'arrivée s'active). Pas de recul en chaîne.
      if (wasBackward || rand() < 0.5) {
        addCoins(s, p, -TREE_BAD_COINS)
        log(s, `${p.name} perd ${TREE_BAD_COINS} pièces (arbre maudit)`, 'BAD')
        popup(s, '🌳 Arbre maudit', `L'arbre secoue ses branches : -${TREE_BAD_COINS} pièces !`, 'BAD')
      } else {
        const back = randInt(TREE_BAD_BACK_MIN, TREE_BAD_BACK_MAX)
        s.movement = { remaining: back, total: back, hopTo: null, backward: true }
        log(s, `${p.name} recule de ${back} case(s) (arbre maudit)`, 'BAD')
        popup(s, '🌳 Arbre maudit', `Le dé maudit te souffle ${back} case${back > 1 ? 's' : ''} en arrière !`, 'BAD')
      }
      break
    }
    case 'SIGNPOST': {
      // Doc Woody Woods : atterrir devant un panneau le fait pivoter.
      const forkId = space.nextSpaces[0]
      const branches = getSpace(forkId).nextSpaces.length
      s.signposts[forkId] = ((s.signposts[forkId] ?? 0) + 1) % branches
      log(s, 'Le panneau indicateur pivote !', 'NEUTRAL')
      popup(s, '🪧 Panneau', 'Le panneau pivote ! La direction conseillée vient de changer.', 'NEUTRAL')
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
      fresh.maxRounds = action.maxRounds
      fresh.players = action.players.map((cfg, i) => ({
        id: PLAYER_IDS[i],
        name: cfg.name.trim() || `Joueur ${i + 1}`,
        color: cfg.color,
        character: cfg.character,
        currentSpaceId: START_SPACE_ID,
        inventory: [],
        coins: START_COINS,
        stars: 0,
        sipsTaken: 0,
        sipsGiven: 0,
        rewardDice: null,
        poisoned: false,
      }))
      fresh.starSpaceId = pick(STAR_SPOTS)
      rerollSignposts(fresh)
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
          popup(s, '🍄 Champignon', '+3 au prochain lancer !', 'GOOD')
          break
        case 'GOLDEN_DASH_MUSHROOM':
          s.rollBonus += 5
          popup(s, '✨ Champignon doré', '+5 au prochain lancer !', 'GOOD')
          break
        case 'POISON_MUSHROOM':
          target!.poisoned = true
          popup(s, '☠️ Champignon poison', `${target!.name} aura -2 à son prochain lancer…`, 'GOOD')
          break
        case 'CUSTOM_DICE_BLOCK': {
          const value = Math.min(6, Math.max(1, Math.round(action.value ?? 1)))
          s.forcedRoll = value
          popup(s, '🎯 Dé truqué', `Ton prochain lancer fera exactement ${value} !`, 'GOOD')
          break
        }
        case 'COINADO': {
          const amount = Math.min(randInt(5, 10), target!.coins)
          target!.coins -= amount
          p.coins += amount
          log(s, `${p.name} vole ${amount} pièces à ${target!.name} (Coinado)`, 'GOOD')
          popup(s, '🌪️ Coinado', `La tornade arrache ${amount} pièces à ${target!.name} !`, 'GOOD')
          break
        }
        case 'FLY_GUY_TICKET': {
          const stolenIdx = randInt(0, target!.inventory.length - 1)
          const [stolen] = target!.inventory.splice(stolenIdx, 1)
          p.inventory.push(stolen)
          const stolenItem = ITEMS[stolen]
          log(s, `${p.name} vole ${stolenItem.emoji} ${stolenItem.name} à ${target!.name}`, 'GOOD')
          popup(s, '🎫 Maskache ailé', `Il rapporte ${stolenItem.emoji} ${stolenItem.name} volé à ${target!.name} !`, 'GOOD')
          break
        }
        case 'GOLDEN_PIPE': {
          const before = PREV[s.starSpaceId][0] ?? s.starSpaceId
          p.currentSpaceId = before
          log(s, `${p.name} surgit du tuyau doré près de l'Étoile`, 'GOOD')
          popup(s, '🪈 Tuyau doré', "Te voilà téléporté juste avant l'Étoile !", 'GOOD')
          break
        }
        case 'HIDDEN_BLOCK_CARD': {
          if (rand() < HIDDEN_BLOCK_STAR_CHANCE) {
            p.stars += 1
            log(s, `${p.name} trouve une ÉTOILE dans le bloc caché !!`, 'GOOD')
            popup(s, '🎁 Bloc caché', '⭐ INCROYABLE : une Étoile !', 'GOOD')
          } else {
            addCoins(s, p, HIDDEN_BLOCK_COINS)
            log(s, `${p.name} trouve ${HIDDEN_BLOCK_COINS} pièces dans le bloc caché`, 'GOOD')
            popup(s, '🎁 Bloc caché', `+${HIDDEN_BLOCK_COINS} pièces !`, 'GOOD')
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
      const allowed: DiceBlockId[] = ['NORMAL', p.character]
      if (p.rewardDice) allowed.push(p.rewardDice)
      if (!allowed.includes(action.blockId)) return state
      prepareRoll(s, action.blockId)
      return s
    }

    case 'DICE_LANDED': {
      if (s.phase !== 'ROLLING' || !s.dice) return state
      const p = current(s)
      const d = s.dice
      if (d.faceCoins !== 0) {
        addCoins(s, p, d.faceCoins)
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
      s.movement = { remaining: d.steps, total: d.steps, hopTo: null, backward: false }
      advanceMovement(s)
      return s
    }

    // ----- Déplacement -----
    case 'STEP_DONE': {
      if (s.phase !== 'MOVING' || !s.movement?.hopTo) return state
      const p = current(s)
      const m = s.movement
      p.currentSpaceId = m.hopTo!
      m.hopTo = null
      m.remaining -= 1
      if (!m.backward) {
        if (p.currentSpaceId === s.starSpaceId) {
          s.phase = 'PASS_EVENT'
          s.pending = { kind: 'STAR_PROMPT' }
          return s
        }
        if (getSpace(p.currentSpaceId).hasBoo) {
          s.phase = 'PASS_EVENT'
          s.pending = { kind: 'BOO_PROMPT' }
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
          const sips = pending.kind === 'CHOOSE_SIP_TARGET' ? pending.sips : SIP_MINUS_AMOUNT
          const target = playerById(s, choice.targetId)
          if (target.id === p.id) return state
          target.sipsTaken += sips
          p.sipsGiven += sips
          log(s, `${p.name} distribue ${sips} gorgées à ${target.name} !`, 'GOOD')
          popup(s, '🍻 Distribution', `${target.name} boit ${sips} gorgées, santé !`, 'GOOD')
          return s
        }
        case 'TREE_GOOD': {
          if (choice.pick === 'COIN_FRUIT') {
            addCoins(s, p, TREE_COIN_FRUIT)
            log(s, `${p.name} croque le Fruit Pièces : +${TREE_COIN_FRUIT} pièces`, 'GOOD')
            popup(s, '🌳 Arbre généreux', `Fruit Pièces : +${TREE_COIN_FRUIT} pièces !`, 'GOOD')
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
            if (p.coins < BOO_STAR_COST) {
              popup(s, '👻 Boo', `Il faut ${BOO_STAR_COST} pièces pour voler une Étoile…`, 'NEUTRAL')
            } else {
              addCoins(s, p, -BOO_STAR_COST)
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
            log(s, `Boo vole ${amount} pièces à ${target.name} pour ${p.name} !`, 'GOOD')
            popup(s, '👻 Boo', `Boo rapporte ${amount} pièces volées à ${target.name} !`, 'GOOD')
          } else if (target.stars > 0) {
            target.stars -= 1
            p.stars += 1
            log(s, `Boo vole une ÉTOILE à ${target.name} pour ${p.name} !!`, 'GOOD')
            popup(s, '👻 Boo', `Boo rapporte une ÉTOILE volée à ${target.name} !`, 'GOOD')
          } else {
            addCoins(s, p, BOO_STAR_COST)
            popup(s, '👻 Boo', `${target.name} n'a pas d'Étoile. Boo te rembourse.`, 'NEUTRAL')
          }
          return s
        }
        case 'STAR': {
          if (choice.buy && p.coins >= STAR_COST) {
            addCoins(s, p, -STAR_COST)
            p.stars += 1
            const others = STAR_SPOTS.filter((id) => id !== s.starSpaceId)
            s.starSpaceId = pick(others)
            log(s, `⭐ ${p.name} achète une Étoile ! Toadette déménage…`, 'GOOD')
            popup(s, '⭐ Étoile !', `${p.name} achète une Étoile pour ${STAR_COST} pièces !`, 'GOOD')
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
          s.minigame = { context: 'VS', pot, category: 'FFA', title: null, ranking: null }
          s.phase = 'MINIGAME_TITLE'
          log(s, `Case VS : ${pot} pièces dans le pot !`, 'SYSTEM')
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
      s.itemUsedThisTurn = false
      s.rollBonus = 0
      if (s.currentPlayerIndex < s.players.length - 1) {
        s.currentPlayerIndex += 1
        s.phase = 'TURN_START'
        log(s, `Au tour de ${current(s).name} !`, 'SYSTEM')
      } else {
        s.minigame = { context: 'ROUND_END', pot: 0, category: null, title: null, ranking: null }
        s.phase = 'MINIGAME_CATEGORY'
        log(s, `Fin de la manche ${s.round} — place au MINIJEU !`, 'SYSTEM')
      }
      return s
    }

    // ----- Minijeux -----
    case 'SPIN_CATEGORY': {
      if (s.phase !== 'MINIGAME_CATEGORY' || !s.minigame || s.minigame.category) return state
      s.minigame.category = pick([...MINIGAME_CATEGORIES])
      log(s, `Catégorie tirée : ${s.minigame.category} !`, 'SYSTEM')
      return s
    }

    case 'SPIN_TITLE': {
      if (!s.minigame || !s.minigame.category || s.minigame.title) return state
      if (s.phase !== 'MINIGAME_CATEGORY' && s.phase !== 'MINIGAME_TITLE') return state
      s.phase = 'MINIGAME_TITLE'
      s.minigame.title = pick(MINIGAMES[s.minigame.category])
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
      if (s.phase !== 'PODIUM' || !s.minigame) return state
      const ranking = action.ranking
      if (ranking.length !== s.players.length) return state
      if (new Set(ranking).size !== ranking.length) return state
      s.minigame.ranking = ranking
      if (s.minigame.context === 'VS') {
        const pot = s.minigame.pot
        let distributed = 0
        ranking.forEach((pid, i) => {
          const share = Math.floor(pot * VS_SPLIT[i])
          distributed += share
          if (share > 0) {
            playerById(s, pid).coins += share
            log(s, `${playerById(s, pid).name} récupère ${share} pièces du pot VS`, 'GOOD')
          }
        })
        playerById(s, ranking[0]).coins += pot - distributed
      } else {
        ranking.forEach((pid, i) => {
          const reward = PODIUM_REWARDS[i]
          const pl = playerById(s, pid)
          pl.rewardDice = reward.dice
          pl.sipsTaken += reward.sips
          log(s, `${pl.name} (${i + 1}ᵉ) : ${reward.label}`, i < 2 ? 'GOOD' : 'BAD')
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
      rerollSignposts(s)
      s.phase = 'TURN_START'
      log(s, `Manche ${s.round}/${s.maxRounds} — ${current(s).name} commence !`, 'SYSTEM')
      return s
    }

    case 'RESTART': {
      const fresh = createInitialState()
      fresh.mode = s.mode
      return fresh
    }

    // ----- God Mode (DebugMode.md) -----
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
      s.minigame = { context: 'ROUND_END', pot: 0, category: null, title: null, ranking: null }
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

    default:
      return state
  }
}
