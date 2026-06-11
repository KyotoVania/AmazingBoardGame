// ============================================================
// types.ts — Toutes les interfaces & types du jeu.
// Sources de vérité :
//   - Docs/RulesMarioParty  (Super Mario Party : cases, items, dés)
//   - Docs/BoardMarioParty + Docs/imgMap.png (Woody Woods)
//   - StartingPrompt.md / DebugMode.md (twists "jeu à boire" + God Mode)
// ============================================================

// ---------- Plateau ----------

/** Types de cases : strictement ceux du wiki SMP + nos cases gorgées custom. */
export type SpaceType =
  | 'START'
  | 'BLUE'
  | 'RED'
  | 'EVENT'
  | 'ITEM'
  | 'LUCKY'
  | 'BAD_LUCK'
  | 'VS'
  | 'SIP_PLUS'
  | 'SIP_MINUS'

/** Événements Woody Woods portés par les cases EVENT. */
export type BoardEventKind = 'TREE_GOOD' | 'TREE_BAD' | 'SIGNPOST'

export interface BoardSpace {
  id: string
  type: SpaceType
  /** Coordonnées vues du dessus (x → droite, y → bas). 1 unité ≈ 1 case. */
  x: number
  y: number
  /** Arêtes sortantes du graphe. Plusieurs entrées = embranchement. */
  nextSpaces: string[]
  /** Pour les cases EVENT : quel événement Woody Woods. */
  event?: BoardEventKind
  /** Un Boo est posté ici : effet proposé au passage. */
  hasBoo?: boolean
  /** Emplacement candidat pour l'Étoile (points jaunes de la map). */
  starSpot?: boolean
}

// ---------- Dés ----------

/** Une face de dé. `coins` = gain/perte de pièces des faces "0" (wiki SMP). */
export interface DiceFace {
  value: number
  coins?: number
}

/** Dés de récompense du podium (cahier des charges custom). */
export type RewardDiceId = 'GOLD' | 'SILVER' | 'CURSED'

export type DiceBlockId = 'NORMAL' | RewardDiceId | CharacterId

export interface DiceBlockDef {
  id: DiceBlockId
  label: string
  /** Exactement 6 faces. */
  faces: DiceFace[]
  /** Teinte du cube 3D. */
  color: string
}

// ---------- Personnages (dés persos du wiki SMP) ----------

export type CharacterId =
  | 'MARIO'
  | 'LUIGI'
  | 'PEACH'
  | 'DAISY'
  | 'WARIO'
  | 'WALUIGI'
  | 'YOSHI'
  | 'ROSALINA'
  | 'BOWSER'
  | 'GOOMBA'
  | 'SHY_GUY'
  | 'KOOPA_TROOPA'
  | 'MONTY_MOLE'
  | 'BOWSER_JR'
  | 'BOO'
  | 'HAMMER_BRO'
  | 'DONKEY_KONG'
  | 'DIDDY_KONG'
  | 'DRY_BONES'
  | 'POM_POM'

export interface CharacterDef {
  id: CharacterId
  name: string
  emoji: string
}

// ---------- Items (wiki SMP, obtenables en mode Mario Party) ----------

export type ItemId =
  | 'DASH_MUSHROOM'
  | 'GOLDEN_DASH_MUSHROOM'
  | 'POISON_MUSHROOM'
  | 'CUSTOM_DICE_BLOCK'
  | 'COINADO'
  | 'FLY_GUY_TICKET'
  | 'GOLDEN_PIPE'
  | 'HIDDEN_BLOCK_CARD'

export interface ItemDef {
  id: ItemId
  name: string
  description: string
  emoji: string
  /** L'item exige le choix d'un adversaire. */
  needsTarget: boolean
  /** L'item exige une valeur saisie (Dé truqué : 1 à 6). */
  needsValue: boolean
}

// ---------- Joueurs ----------

export type PlayerId = 'P1' | 'P2' | 'P3' | 'P4'

export interface Player {
  id: PlayerId
  name: string
  color: string
  character: CharacterId
  currentSpaceId: string
  /** Inventaire, max MAX_INVENTORY (3). */
  inventory: ItemId[]
  coins: number
  stars: number
  sipsTaken: number
  sipsGiven: number
  /** Dé de récompense du podium, à usage unique au prochain lancer. */
  rewardDice: RewardDiceId | null
  /** Champignon poison subi : -2 au prochain lancer. */
  poisoned: boolean
}

export interface LobbyPlayerConfig {
  name: string
  color: string
  character: CharacterId
}

// ---------- Minijeux ----------

export type MinigameCategory = '1v1' | '2v2' | 'FFA'

/** Double tableau configurable : catégorie -> liste de noms de jeux. */
export type MinigameTable = Record<MinigameCategory, string[]>

export type MinigameContext = 'ROUND_END' | 'VS'

export interface MinigameState {
  context: MinigameContext
  /** Pot de pièces misé (cases VS uniquement). */
  pot: number
  category: MinigameCategory | null
  title: string | null
  /** Classement saisi au podium : ranking[0] = 1er. */
  ranking: PlayerId[] | null
}

// ---------- Phases du jeu ----------

export type GamePhase =
  | 'LOBBY'
  | 'TURN_START'
  | 'ROLLING'
  | 'MOVING'
  | 'FORK_CHOICE'
  | 'PASS_EVENT'
  | 'SPACE_ACTION'
  | 'TURN_END'
  | 'MINIGAME_CATEGORY'
  | 'MINIGAME_TITLE'
  | 'MINIGAME_PLAY'
  | 'PODIUM'
  | 'REWARDS'
  | 'GAME_OVER'

export interface DiceRollState {
  blockId: DiceBlockId
  /** Index de la face tirée (0-5), résolu AVANT l'animation 3D. */
  faceIndex: number
  /** Valeur brute de la face. */
  faceValue: number
  /** Total de déplacement après modificateurs (champi, poison). */
  steps: number
  /** Pièces gagnées/perdues par la face (Wario, Rosalina…). */
  faceCoins: number
  /** Détail des modificateurs pour l'affichage. */
  modifierLabel: string | null
}

export interface MovementState {
  /** Pas restants à parcourir. */
  remaining: number
  /** Total de pas du lancer (affichage N/total). */
  total: number
  /** Prochaine case vers laquelle le pion saute (résolue par le reducer). */
  hopTo: string | null
  /** Déplacement arrière (Arbre maudit) : on remonte le graphe. */
  backward: boolean
}

// ---------- Actions en attente (popups / choix à l'écran) ----------

export type PopupTone = 'GOOD' | 'BAD' | 'NEUTRAL'

export type PendingAction =
  | { kind: 'POPUP'; title: string; text: string; tone: PopupTone }
  | { kind: 'CHOOSE_SIP_TARGET'; sips: number }
  | { kind: 'TREE_GOOD_CHOICE' }
  | { kind: 'BOO_PROMPT' }
  | { kind: 'BOO_PICK_VICTIM'; steal: 'COINS' | 'STAR' }
  | { kind: 'STAR_PROMPT' }
  | { kind: 'VS_WAGER'; amount: number }

/** Réponses possibles à une PendingAction. */
export type PendingChoice =
  | { kind: 'DISMISS' }
  | { kind: 'SIP_TARGET'; targetId: PlayerId }
  | { kind: 'TREE_GOOD'; pick: 'COIN_FRUIT' | 'DICE_FRUIT' }
  | { kind: 'BOO'; action: 'STEAL_COINS' | 'STEAL_STAR' | 'DECLINE' }
  | { kind: 'BOO_VICTIM'; targetId: PlayerId }
  | { kind: 'STAR'; buy: boolean }
  | { kind: 'VS_OK' }

// ---------- État global ----------

export type GameMode = 'LIVE' | 'DEBUG'

export interface LogEntry {
  id: number
  text: string
  tone: PopupTone | 'SYSTEM'
}

export interface GameState {
  mode: GameMode
  phase: GamePhase
  /** Manche en cours (1-indexée). */
  round: number
  maxRounds: number
  players: Player[]
  currentPlayerIndex: number
  /** Case où Toadette vend l'Étoile. */
  starSpaceId: string
  /** Cases VS converties en cases bleues après usage (règle SMP). */
  vsConvertedIds: string[]
  /** Index de la branche "suggérée" par les panneaux Woody Woods, par fork. */
  signposts: Record<string, number>
  /** Un seul item utilisable avant le lancer. */
  itemUsedThisTurn: boolean
  /** Bonus de déplacement du tour (Champi +3 / Champi doré +5). */
  rollBonus: number
  dice: DiceRollState | null
  movement: MovementState | null
  pending: PendingAction | null
  minigame: MinigameState | null
  /** Forçage du prochain lancer (DEBUG ou Dé truqué). */
  forcedRoll: number | null
  log: LogEntry[]
  logSeq: number
  winners: PlayerId[] | null
}

// ---------- Actions du reducer ----------

export type DebugStatsPatch = Partial<
  Pick<Player, 'sipsTaken' | 'sipsGiven' | 'coins' | 'stars'>
>

export type GameAction =
  | { type: 'START_GAME'; players: LobbyPlayerConfig[]; maxRounds: number }
  | { type: 'USE_ITEM'; itemId: ItemId; targetId?: PlayerId; value?: number }
  | { type: 'ROLL_DICE'; blockId: DiceBlockId }
  | { type: 'DICE_LANDED' }
  | { type: 'STEP_DONE' }
  | { type: 'CHOOSE_FORK'; nextSpaceId: string }
  | { type: 'RESOLVE_PENDING'; choice: PendingChoice }
  | { type: 'END_TURN' }
  | { type: 'SPIN_CATEGORY' }
  | { type: 'SPIN_TITLE' }
  | { type: 'GO_PLAY' }
  | { type: 'GO_PODIUM' }
  | { type: 'SET_PODIUM'; ranking: PlayerId[] }
  | { type: 'CONTINUE' }
  | { type: 'RESTART' }
  // ----- God Mode (DebugMode.md) -----
  | { type: 'DEBUG_SET_MODE'; mode: GameMode }
  | { type: 'DEBUG_FORCE_ROLL'; value: number | null }
  | { type: 'DEBUG_TELEPORT'; playerId: PlayerId; spaceId: string }
  | { type: 'DEBUG_INJECT_ITEM'; playerId: PlayerId; itemId: ItemId }
  | { type: 'DEBUG_TRIGGER_MINIGAME' }
  | { type: 'DEBUG_EDIT_STATS'; playerId: PlayerId; patch: DebugStatsPatch }
