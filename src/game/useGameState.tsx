// ============================================================
// useGameState.tsx — Le hook d'état de jeu (contexte React).
// Expose toutes les actions du moteur, y compris les overrides
// God Mode exigés par DebugMode.md, sans casser la boucle de tour.
// ============================================================

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { createInitialState, gameReducer } from './reducer'
import type {
  DebugStatsPatch,
  DiceBlockId,
  GameMode,
  GameState,
  ItemId,
  LobbyPlayerConfig,
  PendingChoice,
  PlayerId,
} from './types'

export interface GameApi {
  state: GameState
  startGame: (players: LobbyPlayerConfig[], maxRounds: number) => void
  useItem: (itemId: ItemId, targetId?: PlayerId, value?: number) => void
  rollDice: (blockId: DiceBlockId) => void
  diceLanded: () => void
  stepDone: () => void
  chooseFork: (nextSpaceId: string) => void
  resolvePending: (choice: PendingChoice) => void
  endTurn: () => void
  spinCategory: () => void
  spinTitle: () => void
  goPlay: () => void
  goPodium: () => void
  setPodium: (ranking: PlayerId[]) => void
  continueGame: () => void
  restart: () => void
  debug: {
    setMode: (mode: GameMode) => void
    toggleMode: () => void
    forceRoll: (value: number | null) => void
    teleport: (playerId: PlayerId, spaceId: string) => void
    injectItem: (playerId: PlayerId, itemId: ItemId) => void
    triggerMinigame: () => void
    editStats: (playerId: PlayerId, patch: DebugStatsPatch) => void
  }
}

const GameContext = createContext<GameApi | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState)

  const api = useMemo<GameApi>(
    () => ({
      state,
      startGame: (players, maxRounds) => dispatch({ type: 'START_GAME', players, maxRounds }),
      useItem: (itemId, targetId, value) => dispatch({ type: 'USE_ITEM', itemId, targetId, value }),
      rollDice: (blockId) => dispatch({ type: 'ROLL_DICE', blockId }),
      diceLanded: () => dispatch({ type: 'DICE_LANDED' }),
      stepDone: () => dispatch({ type: 'STEP_DONE' }),
      chooseFork: (nextSpaceId) => dispatch({ type: 'CHOOSE_FORK', nextSpaceId }),
      resolvePending: (choice) => dispatch({ type: 'RESOLVE_PENDING', choice }),
      endTurn: () => dispatch({ type: 'END_TURN' }),
      spinCategory: () => dispatch({ type: 'SPIN_CATEGORY' }),
      spinTitle: () => dispatch({ type: 'SPIN_TITLE' }),
      goPlay: () => dispatch({ type: 'GO_PLAY' }),
      goPodium: () => dispatch({ type: 'GO_PODIUM' }),
      setPodium: (ranking) => dispatch({ type: 'SET_PODIUM', ranking }),
      continueGame: () => dispatch({ type: 'CONTINUE' }),
      restart: () => dispatch({ type: 'RESTART' }),
      debug: {
        setMode: (mode) => dispatch({ type: 'DEBUG_SET_MODE', mode }),
        toggleMode: () =>
          dispatch({ type: 'DEBUG_SET_MODE', mode: state.mode === 'LIVE' ? 'DEBUG' : 'LIVE' }),
        forceRoll: (value) => dispatch({ type: 'DEBUG_FORCE_ROLL', value }),
        teleport: (playerId, spaceId) => dispatch({ type: 'DEBUG_TELEPORT', playerId, spaceId }),
        injectItem: (playerId, itemId) => dispatch({ type: 'DEBUG_INJECT_ITEM', playerId, itemId }),
        triggerMinigame: () => dispatch({ type: 'DEBUG_TRIGGER_MINIGAME' }),
        editStats: (playerId, patch) => dispatch({ type: 'DEBUG_EDIT_STATS', playerId, patch }),
      },
    }),
    [state],
  )

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame doit être appelé sous <GameProvider>')
  return ctx
}
