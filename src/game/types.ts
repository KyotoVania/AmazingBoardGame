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
  | 'ALLY'
  | 'BANK'
  | 'REVERSE'
  | 'WAYPOINT'
  | 'SIP_PLUS'
  | 'SIP_MINUS'

/** Événements portés par les cases EVENT (Woody Woods + customs). */
export type BoardEventKind = 'TREE_GOOD' | 'TREE_BAD' | 'SIGNPOST' | 'PIT'

export interface BoardSpace {
  id: string
  type: SpaceType
  /** Coordonnées vues du dessus (x → droite, y → bas). 1 unité ≈ 1 case. */
  x: number
  y: number
  /** Arêtes sortantes du graphe. Plusieurs entrées = embranchement. */
  nextSpaces: string[]
  /** Pour les cases EVENT : quel événement. */
  event?: BoardEventKind
  /** Un Boo est posté ici : effet proposé au passage. */
  hasBoo?: boolean
  /** Topi Taupe est posté ici : réoriente les panneaux contre des pièces. */
  hasMole?: boolean
  /** Un mur destructible barre l'entrée de cette case. */
  wall?: boolean
  /** Un portail à péage barre l'entrée de cette case (coût aléatoire). */
  gate?: boolean
  /** La boutique de Flutter est postée ici : achat proposé au passage. */
  hasShop?: boolean
  /** Emplacement candidat pour l'Étoile (points jaunes de la map). */
  starSpot?: boolean
  /** Libellés humains des branches sortantes (forks), même ordre que nextSpaces. */
  branchLabels?: string[]
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
  | 'CHOMP_CALL'
  | 'ALLY_PHONE'
  | 'GOLDEN_DRINK'
  | 'PEEPA_BELL'
  | 'DUELING_GLOVE'
  | 'DOUBLE_CARD'

export interface ItemDef {
  id: ItemId
  name: string
  description: string
  emoji: string
  /** L'item exige le choix d'un adversaire. */
  needsTarget: boolean
  /** L'item exige une valeur saisie (Dé truqué : 1 à 6). */
  needsValue: boolean
  /** Prix en boutique (doc SMP / Woody Woods : Chomp Call 6, Tuyau doré 25…). */
  price: number
  /** Manche à partir de laquelle l'item apparaît en boutique (fraction de maxRounds, 0-1). */
  shopFrom: number
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
  /**
   * Dé BONUS gagné au podium : lancé AUTOMATIQUEMENT en plus du dé
   * principal au prochain lancer, puis consommé.
   */
  rewardDice: RewardDiceId | null
  /** Image custom (dataURL) affichée au-dessus du pion à la place de l'emoji. */
  avatarUrl: string | null
  /** Champignon poison subi : -2 au prochain lancer. */
  poisoned: boolean
  /** Boisson dorée (SMP) : +1 pièce par case parcourue ce tour. */
  goldenDrink?: boolean
  /** Un Peepa le suit (SMP) : 1 pièce volée par case, au profit de ce joueur. */
  peepaBy?: PlayerId | null
  /** Double Carte (SMP) : la prochaine visite chez Toadette donne 2 Étoiles. */
  doubleCard?: boolean
  /** Coincé dans le trou : il faut un lancer suffisant pour sortir. */
  trapped: boolean
  /** Case Inversion : le joueur parcourt le plateau à contresens. */
  reversed?: boolean
  /**
   * Alliés (règle SMP) : chaque allié ajoute +1 ou +2 au lancer et suit
   * le pion en 3D. Optionnel pour la compat des saves.
   */
  allies?: CharacterId[]
  /** Compteurs de soirée (titres de fin de partie). Optionnel pour la compat des saves. */
  stats?: {
    itemsUsed: number
    pitFalls: number
    wallsBroken: number
  }
}

export interface LobbyPlayerConfig {
  name: string
  color: string
  character: CharacterId
  /** Image custom (dataURL) optionnelle pour le pion. */
  avatarUrl?: string | null
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
  /**
   * Résultat saisi au podium : un groupe de joueurs par emplacement du
   * layout de la catégorie (FFA : 4 rangs ; 2v2 : gagnants/perdants ;
   * 1v1 : vainqueur/perdant/spectateurs).
   */
  groups: PlayerId[][] | null
  /**
   * Participants tirés AUTOMATIQUEMENT à la roulette de catégorie :
   * 1v1 -> [[a], [b]] (les 2 duellistes), 2v2 -> [[a, b], [c, d]].
   * null pour FFA (tout le monde joue).
   */
  teams: PlayerId[][] | null
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
  | 'ROUND_INTRO'
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
  /** Dé BONUS du podium, lancé en plus du dé principal (2e cube 3D). */
  bonus: { blockId: RewardDiceId; faceIndex: number; faceValue: number } | null
}

export interface MovementState {
  /** Pas restants à parcourir. */
  remaining: number
  /** Garde anti-boucle : nombre total de sauts effectués ce déplacement. */
  hops?: number
  /** Total de pas du lancer (affichage N/total). */
  total: number
  /** Prochaine case vers laquelle le pion saute (résolue par le reducer). */
  hopTo: string | null
  /** Déplacement arrière (Arbre maudit) : on remonte le graphe. */
  backward: boolean
  /**
   * Case d'où l'on vient (pas précédent) : aux carrefours bidirectionnels,
   * interdit le demi-tour immédiat.
   */
  cameFrom: string | null
}

// ---------- Effets visuels one-shot ----------

export type FxKind =
  | 'STEAL_COINS' // vol de pièces (Coinado, Boo)
  | 'STEAL_STAR' // vol d'Étoile (Boo)
  | 'STAR_BUY' // achat d'Étoile à Toadette
  | 'WALL_BREAK' // mur pulvérisé
  | 'PIT_FALL' // chute dans le trou
  | 'SIPS' // gorgées bues / distribuées

export interface FxEvent {
  id: number
  kind: FxKind
  amount?: number
  fromName: string
  toName: string
  fromColor: string
  toColor: string
}

// ---------- Roue de Kamek (case poisse) ----------

/** Un sort de la Roue de Kamek. Tiré par le moteur, révélé par la roulette. */
export type BadLuckOutcome =
  | { kind: 'LOSE_COINS'; amount: number }
  | { kind: 'LOSE_ITEM'; index: number }
  | { kind: 'GIVE_COINS'; targetId: PlayerId; amount: number }
  | { kind: 'SIPS'; amount: number }
  | { kind: 'BACK'; steps: number }

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
  | { kind: 'MOLE_PROMPT'; cost: number }
  | { kind: 'BAD_LUCK_WHEEL'; options: BadLuckOutcome[]; resultIndex: number }
  | { kind: 'WALL_PROMPT'; spaceId: string; strength: number }
  | { kind: 'SHOP_PROMPT'; stock: ItemId[] }
  | { kind: 'GATE_PROMPT'; targetId: string; cost: GateCost }

/** Coût tiré au sort d'un portail à péage (pièces OU étoile). */
export interface GateCost {
  coins?: number
  stars?: number
}

/** Réponses possibles à une PendingAction. */
export type PendingChoice =
  | { kind: 'DISMISS' }
  | { kind: 'SIP_TARGET'; targetId: PlayerId }
  | { kind: 'TREE_GOOD'; pick: 'COIN_FRUIT' | 'DICE_FRUIT' }
  | { kind: 'BOO'; action: 'STEAL_COINS' | 'STEAL_STAR' | 'DECLINE' }
  | { kind: 'BOO_VICTIM'; targetId: PlayerId }
  | { kind: 'STAR'; buy: boolean }
  | { kind: 'VS_OK' }
  | { kind: 'MOLE'; pay: boolean; directions?: Record<string, number> }
  | { kind: 'BAD_LUCK_DONE' }
  | { kind: 'WALL_TRY' }
  | { kind: 'SHOP_BUY'; itemId: ItemId }
  | { kind: 'SHOP_LEAVE' }
  | { kind: 'GATE'; pay: boolean }

// ---------- Configuration runtime (Config Panel) ----------

/**
 * Les règles AJUSTABLES sans rebuild, éditées dans le Config Panel
 * (au lobby, ou en cours de partie en mode DEBUG). Les valeurs par
 * défaut viennent de constants.ts (DEFAULT_GAME_CONFIG).
 */
export interface GameConfig {
  /** Pièces gagnées sur case bleue. */
  blueCoins: number
  /** Pièces perdues sur case rouge. */
  redCoins: number
  /** Prix de l'Étoile chez Toadette. */
  starCost: number
  /** Prix du vol d'Étoile par Boo. */
  booStarCost: number
  /** Gorgées bues sur SIP_PLUS. */
  sipPlus: number
  /** Gorgées distribuées sur SIP_MINUS. */
  sipMinus: number
  /** Lancer minimum pour sortir du trou. */
  pitEscapeMin: number
  /** Solidité initiale du mur. */
  wallStrength: number
  /** Tables de minijeux par catégorie. */
  minigames: MinigameTable
  /**
   * Intervalle (minutes) entre deux ÉVÉNEMENTS CURSED (image/GIF plein
   * écran tirée de public/images/cursed/). 0 = désactivé.
   */
  cursedIntervalMin: number
}

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
  /** Règles ajustables (Config Panel). */
  config: GameConfig
  /** Manche en cours (1-indexée). */
  round: number
  maxRounds: number
  players: Player[]
  currentPlayerIndex: number
  /** Case où Toadette vend l'Étoile. */
  starSpaceId: string
  /** Cases VS converties en cases bleues après usage (règle SMP). */
  vsConvertedIds: string[]
  /**
   * Cases bleues MAUDITES en secret par Kamek (règle SMP : il en ajoute
   * à mi-partie, puis encore en dernière manche). Y atterrir déclenche
   * la Roue de Kamek et révèle la malédiction.
   */
  cursedSpaceIds: string[]
  /** Direction DICTÉE par chaque panneau (index de branche, par fork). */
  signposts: Record<string, number>
  /** Solidité restante des murs, par case (0 = cassé). */
  walls: Record<string, number>
  /** Cagnotte commune des Banques Koopa (péages de passage). */
  bankPot: number
  /** Un seul item utilisable avant le lancer. */
  itemUsedThisTurn: boolean
  /** Bonus de déplacement du tour (Champi +3 / Champi doré +5). */
  rollBonus: number
  dice: DiceRollState | null
  movement: MovementState | null
  pending: PendingAction | null
  minigame: MinigameState | null
  /** Effet visuel one-shot (vols, étoile, mur, trou, gorgées). */
  fx: FxEvent | null
  /** Case que la caméra doit cadrer pendant un événement (arbres, trou, panneaux…). */
  focusSpaceId: string | null
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
  | { type: 'SET_PODIUM'; groups: PlayerId[][] }
  | { type: 'CONTINUE' }
  | { type: 'BEGIN_ROUND' }
  | { type: 'SET_CONFIG'; patch: Partial<GameConfig> }
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'RESTART' }
  // ----- God Mode (DebugMode.md + extensions) -----
  | { type: 'DEBUG_SET_MODE'; mode: GameMode }
  | { type: 'DEBUG_FORCE_ROLL'; value: number | null }
  | { type: 'DEBUG_TELEPORT'; playerId: PlayerId; spaceId: string }
  | { type: 'DEBUG_INJECT_ITEM'; playerId: PlayerId; itemId: ItemId }
  | { type: 'DEBUG_TRIGGER_MINIGAME' }
  | { type: 'DEBUG_EDIT_STATS'; playerId: PlayerId; patch: DebugStatsPatch }
  | { type: 'DEBUG_SET_TURN'; playerId: PlayerId }
  | { type: 'DEBUG_SET_WALL'; spaceId: string; strength: number }
  | { type: 'DEBUG_SET_TRAPPED'; playerId: PlayerId; trapped: boolean }
  | { type: 'DEBUG_REROLL_SIGNPOSTS' }
