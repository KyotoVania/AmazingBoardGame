// ============================================================
// constants.ts — Toute la configuration du jeu, isolée.
// Les items, dés et effets de cases sont extraits tels quels de
// Docs/RulesMarioParty (Super Mario Party). Les valeurs marquées
// [ADAPTATION] sont nos réglages "jeu à boire" / non chiffrés par
// le wiki — modifiables librement ici.
// ============================================================

import type {
  CharacterDef,
  CharacterId,
  DiceBlockDef,
  DiceBlockId,
  ItemDef,
  ItemId,
  LobbyPlayerConfig,
  MinigameCategory,
  MinigameTable,
  RewardDiceId,
} from './types'

// ---------- Réglages généraux ----------

export const MAX_INVENTORY = 3 // cahier des charges : max 3 items
export const ROUND_OPTIONS = [10, 15, 20] as const // options de tours SMP
export const DEFAULT_ROUNDS = 10

export const START_COINS = 10 // [ADAPTATION] pièces de départ
export const STAR_COST = 10 // wiki SMP : "Stars cost 10 coins"
export const BLUE_COINS = 3 // wiki SMP : case bleue +3
export const RED_COINS = 3 // wiki SMP : case rouge -3

// Cases gorgées custom (cahier des charges)
export const SIP_PLUS_AMOUNT = 2 // [ADAPTATION] gorgées bues
export const SIP_MINUS_AMOUNT = 2 // [ADAPTATION] gorgées distribuées

// Woody Woods (Docs/BoardMarioParty)
export const TREE_COIN_FRUIT = 5 // [ADAPTATION] "Coin Fruit" : montant libre
export const TREE_BAD_COINS = 5 // [ADAPTATION] arbre maudit : perte de pièces
export const TREE_BAD_BACK_MIN = 1 // [ADAPTATION] recul arbre maudit
export const TREE_BAD_BACK_MAX = 3
export const BOO_STEAL_COINS = 10 // [ADAPTATION] Boo vole des pièces gratuitement
export const BOO_STAR_COST = 50 // doc Superstars : "a Star for 50 Coins"

// Topi Taupe (doc : réoriente les panneaux, "the cost seems to be random")
export const MOLE_COST_MIN = 3 // [ADAPTATION]
export const MOLE_COST_MAX = 10 // [ADAPTATION]

// Événements spéciaux custom
export const PIT_ESCAPE_MIN = 4 // [ADAPTATION] lancer minimum pour sortir du trou
export const WALL_INITIAL_STRENGTH = 6 // demandé : commence à 6, -1 par échec

// Cases Chance / Poisse (wiki SMP : gagner/perdre items ou pièces)
export const LUCKY_COINS = [5, 10] as const
export const BAD_LUCK_COINS = [5, 10] as const

// Roue de Kamek (case poisse) : les sorts possibles [ADAPTATION]
export const KAMEK_GIVE_COINS = 5
export const KAMEK_SIPS = 2
export const KAMEK_BACK_MIN = 2
export const KAMEK_BACK_MAX = 3

// Case VS (wiki SMP : mise déterminée par roulette, le gagnant
// rafle la majorité du pot)
export const VS_WAGERS = [5, 10, 15, 20] as const
export const VS_SPLIT = [0.6, 0.3, 0.1, 0] as const // [ADAPTATION] répartition

// Hidden Block Card (wiki SMP : chance de pièces ou d'Étoile)
export const HIDDEN_BLOCK_STAR_CHANCE = 0.2 // [ADAPTATION]
export const HIDDEN_BLOCK_COINS = 10 // [ADAPTATION]

// ---------- Récompenses du podium (cahier des charges custom) ----------
// Le dé gagné est un BONUS : une 3e option de lancer, conservée
// jusqu'à utilisation (pas un remplacement du dé normal/perso).
// Le layout du podium s'adapte à la catégorie du minijeu joué.

export interface PodiumSlotDef {
  label: string
  /** Nombre de joueurs à placer dans cet emplacement. */
  count: number
  dice: RewardDiceId | null // null = pas de dé bonus
  sips: number // gorgées bues par CHAQUE joueur du groupe
}

export const PODIUM_LAYOUTS: Record<MinigameCategory, PodiumSlotDef[]> = {
  FFA: [
    { label: '1er', count: 1, dice: 'GOLD', sips: 0 },
    { label: '2e', count: 1, dice: 'SILVER', sips: 1 },
    { label: '3e', count: 1, dice: null, sips: 2 },
    { label: '4e', count: 1, dice: 'CURSED', sips: 3 },
  ],
  '2v2': [
    { label: 'Gagnants', count: 2, dice: 'GOLD', sips: 0 },
    { label: 'Perdants', count: 2, dice: 'CURSED', sips: 2 },
  ],
  '1v1': [
    { label: 'Vainqueur', count: 1, dice: 'GOLD', sips: 0 },
    { label: 'Perdant', count: 1, dice: 'CURSED', sips: 3 },
    { label: 'Spectateurs', count: 2, dice: null, sips: 0 },
  ],
}

// ---------- Personnages (wiki SMP : 20 jouables) ----------

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  MARIO: { id: 'MARIO', name: 'Mario', emoji: '🧢' },
  LUIGI: { id: 'LUIGI', name: 'Luigi', emoji: '💚' },
  PEACH: { id: 'PEACH', name: 'Peach', emoji: '👑' },
  DAISY: { id: 'DAISY', name: 'Daisy', emoji: '🌼' },
  WARIO: { id: 'WARIO', name: 'Wario', emoji: '💰' },
  WALUIGI: { id: 'WALUIGI', name: 'Waluigi', emoji: '🃏' },
  YOSHI: { id: 'YOSHI', name: 'Yoshi', emoji: '🦖' },
  ROSALINA: { id: 'ROSALINA', name: 'Rosalina', emoji: '🌠' },
  BOWSER: { id: 'BOWSER', name: 'Bowser', emoji: '🐲' },
  GOOMBA: { id: 'GOOMBA', name: 'Goomba', emoji: '🌰' },
  SHY_GUY: { id: 'SHY_GUY', name: 'Maskass', emoji: '🎭' },
  KOOPA_TROOPA: { id: 'KOOPA_TROOPA', name: 'Koopa', emoji: '🐢' },
  MONTY_MOLE: { id: 'MONTY_MOLE', name: 'Topi Taupe', emoji: '🦔' },
  BOWSER_JR: { id: 'BOWSER_JR', name: 'Bowser Jr.', emoji: '🐊' },
  BOO: { id: 'BOO', name: 'Boo', emoji: '👻' },
  HAMMER_BRO: { id: 'HAMMER_BRO', name: 'Frère Marto', emoji: '🔨' },
  DONKEY_KONG: { id: 'DONKEY_KONG', name: 'Donkey Kong', emoji: '🦍' },
  DIDDY_KONG: { id: 'DIDDY_KONG', name: 'Diddy Kong', emoji: '🐵' },
  DRY_BONES: { id: 'DRY_BONES', name: 'Skelerex', emoji: '💀' },
  POM_POM: { id: 'POM_POM', name: 'Pom Pom', emoji: '🪃' },
}

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[]

// ---------- Dés (valeurs exactes du wiki SMP) ----------

export const DICE_BLOCKS: Record<DiceBlockId, DiceBlockDef> = {
  NORMAL: {
    id: 'NORMAL',
    label: 'Dé Normal',
    color: '#f4f1ea',
    faces: [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }],
  },
  // --- Dés de récompense (cahier des charges : plages 4-10 / 3-8 / 1-3) ---
  GOLD: {
    id: 'GOLD',
    label: 'Dé Or',
    color: '#f6c244',
    faces: [{ value: 4 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }, { value: 10 }],
  },
  SILVER: {
    id: 'SILVER',
    label: 'Dé Argent',
    color: '#c8d2dc',
    faces: [{ value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }],
  },
  CURSED: {
    id: 'CURSED',
    label: 'Dé Maudit',
    color: '#5b2a86',
    faces: [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 2 }, { value: 3 }, { value: 3 }],
  },
  // --- Dés de personnages (wiki SMP, valeurs exactes) ---
  MARIO: {
    id: 'MARIO',
    label: 'Dé Mario',
    color: '#e3342f',
    faces: [{ value: 1 }, { value: 3 }, { value: 3 }, { value: 3 }, { value: 5 }, { value: 6 }],
  },
  LUIGI: {
    id: 'LUIGI',
    label: 'Dé Luigi',
    color: '#2fa05a',
    faces: [{ value: 1 }, { value: 1 }, { value: 1 }, { value: 5 }, { value: 6 }, { value: 7 }],
  },
  PEACH: {
    id: 'PEACH',
    label: 'Dé Peach',
    color: '#f7a8c4',
    faces: [{ value: 0 }, { value: 2 }, { value: 4 }, { value: 4 }, { value: 4 }, { value: 6 }],
  },
  DAISY: {
    id: 'DAISY',
    label: 'Dé Daisy',
    color: '#f8b630',
    faces: [{ value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }, { value: 4 }, { value: 4 }],
  },
  WARIO: {
    id: 'WARIO',
    label: 'Dé Wario',
    color: '#e8c51d',
    faces: [
      { value: 0, coins: -2 },
      { value: 0, coins: -2 },
      { value: 6 },
      { value: 6 },
      { value: 6 },
      { value: 6 },
    ],
  },
  WALUIGI: {
    id: 'WALUIGI',
    label: 'Dé Waluigi',
    color: '#6b3fa0',
    faces: [
      { value: 0, coins: -3 },
      { value: 1 },
      { value: 3 },
      { value: 5 },
      { value: 5 },
      { value: 7 },
    ],
  },
  YOSHI: {
    id: 'YOSHI',
    label: 'Dé Yoshi',
    color: '#6fc52e',
    faces: [{ value: 0 }, { value: 1 }, { value: 3 }, { value: 3 }, { value: 5 }, { value: 7 }],
  },
  ROSALINA: {
    id: 'ROSALINA',
    label: 'Dé Rosalina',
    color: '#7fd8e8',
    faces: [
      { value: 0, coins: 2 },
      { value: 0, coins: 2 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
      { value: 8 },
    ],
  },
  BOWSER: {
    id: 'BOWSER',
    label: 'Dé Bowser',
    color: '#a64f1e',
    faces: [
      { value: 0, coins: -3 },
      { value: 0, coins: -3 },
      { value: 1 },
      { value: 8 },
      { value: 9 },
      { value: 10 },
    ],
  },
  GOOMBA: {
    id: 'GOOMBA',
    label: 'Dé Goomba',
    color: '#9a6a35',
    faces: [
      { value: 0, coins: 2 },
      { value: 0, coins: 2 },
      { value: 3 },
      { value: 4 },
      { value: 5 },
      { value: 6 },
    ],
  },
  SHY_GUY: {
    id: 'SHY_GUY',
    label: 'Dé Maskass',
    color: '#d8403a',
    faces: [{ value: 0 }, { value: 4 }, { value: 4 }, { value: 4 }, { value: 4 }, { value: 4 }],
  },
  KOOPA_TROOPA: {
    id: 'KOOPA_TROOPA',
    label: 'Dé Koopa',
    color: '#3cb054',
    faces: [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 3 }, { value: 10 }],
  },
  MONTY_MOLE: {
    id: 'MONTY_MOLE',
    label: 'Dé Topi Taupe',
    color: '#7d4f24',
    faces: [
      { value: 0, coins: 1 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
      { value: 5 },
      { value: 6 },
    ],
  },
  BOWSER_JR: {
    id: 'BOWSER_JR',
    label: 'Dé Bowser Jr.',
    color: '#e98a3c',
    faces: [{ value: 1 }, { value: 1 }, { value: 1 }, { value: 4 }, { value: 4 }, { value: 9 }],
  },
  BOO: {
    id: 'BOO',
    label: 'Dé Boo',
    color: '#e8e6f0',
    faces: [
      { value: 0, coins: -2 },
      { value: 0, coins: -2 },
      { value: 5 },
      { value: 5 },
      { value: 7 },
      { value: 7 },
    ],
  },
  HAMMER_BRO: {
    id: 'HAMMER_BRO',
    label: 'Dé Frère Marto',
    color: '#2e8b6e',
    faces: [
      { value: 0, coins: 3 },
      { value: 1 },
      { value: 1 },
      { value: 5 },
      { value: 5 },
      { value: 5 },
    ],
  },
  DONKEY_KONG: {
    id: 'DONKEY_KONG',
    label: 'Dé Donkey Kong',
    color: '#6b3a17',
    faces: [
      { value: 0, coins: 5 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
      { value: 10 },
      { value: 10 },
    ],
  },
  DIDDY_KONG: {
    id: 'DIDDY_KONG',
    label: 'Dé Diddy Kong',
    color: '#c97a2b',
    faces: [
      { value: 0, coins: 2 },
      { value: 0 },
      { value: 0 },
      { value: 7 },
      { value: 7 },
      { value: 7 },
    ],
  },
  DRY_BONES: {
    id: 'DRY_BONES',
    label: 'Dé Skelerex',
    color: '#d9d4c8',
    faces: [{ value: 1 }, { value: 1 }, { value: 1 }, { value: 6 }, { value: 6 }, { value: 6 }],
  },
  POM_POM: {
    id: 'POM_POM',
    label: 'Dé Pom Pom',
    color: '#ef6fa7',
    faces: [{ value: 0 }, { value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }, { value: 8 }],
  },
}

// ---------- Items (wiki SMP, effets exacts) ----------

export const ITEMS: Record<ItemId, ItemDef> = {
  DASH_MUSHROOM: {
    id: 'DASH_MUSHROOM',
    name: 'Champignon',
    description: '+3 au lancer de dé.',
    emoji: '🍄',
    needsTarget: false,
    needsValue: false,
  },
  GOLDEN_DASH_MUSHROOM: {
    id: 'GOLDEN_DASH_MUSHROOM',
    name: 'Champignon doré',
    description: '+5 au lancer de dé.',
    emoji: '✨',
    needsTarget: false,
    needsValue: false,
  },
  POISON_MUSHROOM: {
    id: 'POISON_MUSHROOM',
    name: 'Champignon poison',
    description: '-2 au prochain lancer d’un adversaire.',
    emoji: '☠️',
    needsTarget: true,
    needsValue: false,
  },
  CUSTOM_DICE_BLOCK: {
    id: 'CUSTOM_DICE_BLOCK',
    name: 'Dé truqué',
    description: 'Choisis le résultat de ton lancer (1 à 6).',
    emoji: '🎯',
    needsTarget: false,
    needsValue: true,
  },
  COINADO: {
    id: 'COINADO',
    name: 'Coinado',
    description: 'Vole 5 à 10 pièces à un adversaire.',
    emoji: '🌪️',
    needsTarget: true,
    needsValue: false,
  },
  FLY_GUY_TICKET: {
    id: 'FLY_GUY_TICKET',
    name: 'Ticket Maskache ailé',
    description: 'Vole un item au hasard à un adversaire.',
    emoji: '🎫',
    needsTarget: true,
    needsValue: false,
  },
  GOLDEN_PIPE: {
    id: 'GOLDEN_PIPE',
    name: 'Tuyau doré',
    description: 'Téléporte juste avant l’Étoile.',
    emoji: '🪈',
    needsTarget: false,
    needsValue: false,
  },
  HIDDEN_BLOCK_CARD: {
    id: 'HIDDEN_BLOCK_CARD',
    name: 'Carte Bloc caché',
    description: 'Avec un peu de chance… une Étoile !',
    emoji: '🎁',
    needsTarget: false,
    needsValue: false,
  },
}

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]

/** Pool de tirage des cases Item/Chance (pondération [ADAPTATION]). */
export const ITEM_POOL: ItemId[] = [
  'DASH_MUSHROOM',
  'DASH_MUSHROOM',
  'DASH_MUSHROOM',
  'GOLDEN_DASH_MUSHROOM',
  'GOLDEN_DASH_MUSHROOM',
  'POISON_MUSHROOM',
  'POISON_MUSHROOM',
  'CUSTOM_DICE_BLOCK',
  'CUSTOM_DICE_BLOCK',
  'COINADO',
  'COINADO',
  'FLY_GUY_TICKET',
  'HIDDEN_BLOCK_CARD',
  'GOLDEN_PIPE',
]

// ---------- Roulette des minijeux (double tableau configurable) ----------

export const MINIGAME_CATEGORIES = ['FFA', '1v1', '2v2'] as const

export const MINIGAMES: MinigameTable = {
  FFA: [
    'Shifumi Royale',
    'Le Roi du Pouce',
    'Quiz Cul Sec',
    'Limbo du Salon',
    'Chaises Musicales',
    'Ni Oui Ni Non',
  ],
  '1v1': [
    'Bras de Fer',
    'Duel de Regards',
    'Pile ou Face Menteur',
    'Baby-foot 1v1',
    'Pierre-Feuille-Ciseaux en 3',
  ],
  '2v2': [
    'Beer Pong 2v2',
    'Flip Cup',
    'Time’s Up Express',
    'Baby-foot 2v2',
    'Mime en Duo',
  ],
}

// ---------- Couleurs de joueurs proposées au lobby ----------

export const PLAYER_COLORS = [
  '#ff4d4d', // rouge
  '#3b82f6', // bleu
  '#22c55e', // vert
  '#facc15', // jaune
  '#a855f7', // violet
  '#fb7185', // rose
  '#2dd4bf', // turquoise
  '#f97316', // orange
] as const

export const DEFAULT_LOBBY: LobbyPlayerConfig[] = [
  { name: 'Équipe Rouge', color: PLAYER_COLORS[0], character: 'MARIO' },
  { name: 'Équipe Bleue', color: PLAYER_COLORS[1], character: 'LUIGI' },
  { name: 'Équipe Verte', color: PLAYER_COLORS[2], character: 'YOSHI' },
  { name: 'Équipe Jaune', color: PLAYER_COLORS[3], character: 'PEACH' },
]

// ---------- Configuration runtime par défaut (Config Panel) ----------

import type { GameConfig } from './types'

/** Valeurs par défaut des règles ajustables — alignées sur les constantes. */
export function defaultGameConfig(): GameConfig {
  return {
    blueCoins: BLUE_COINS,
    redCoins: RED_COINS,
    starCost: STAR_COST,
    booStarCost: BOO_STAR_COST,
    sipPlus: SIP_PLUS_AMOUNT,
    sipMinus: SIP_MINUS_AMOUNT,
    pitEscapeMin: PIT_ESCAPE_MIN,
    wallStrength: WALL_INITIAL_STRENGTH,
    minigames: structuredClone(MINIGAMES),
  }
}
