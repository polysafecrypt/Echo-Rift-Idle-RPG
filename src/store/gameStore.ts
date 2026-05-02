// =============================================
// ECHO RIFT — GAME STORE (Global State)
// =============================================

import { create } from 'zustand'
import { PlayerState, Item, ActiveQuest, ArenaOpponent } from '../types'

// ✅ Quest tamamlanma toast verisi
export interface QuestCompletedData {
  questName: string
  xp: number
  gold: number
  items: number
}

interface GameStore {
  // Player State
  playerState: PlayerState | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Arena
  arenaOpponents: ArenaOpponent[]

  // ✅ Global quest completion
  questCompleted: QuestCompletedData | null

  // Actions
  setPlayerState: (state: PlayerState) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setError: (error: string | null) => void
  setArenaOpponents: (opponents: ArenaOpponent[]) => void
  setQuestCompleted: (data: QuestCompletedData | null) => void

  // Optimistic updates (UI anında güncellenir)
  updateStamina: (newStamina: number) => void
  addActiveQuest: (quest: ActiveQuest) => void
  removeQuest: (questId: string) => void
  updateGold: (gold: number) => void
  updateRC: (rc: number) => void
  updateScrap: (scrap: number) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  playerState: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  arenaOpponents: [],
  questCompleted: null,

  setPlayerState: (state) => set({ playerState: state }),
  setLoading: (loading) => set({ isLoading: loading }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setError: (error) => set({ error }),
  setArenaOpponents: (opponents) => set({ arenaOpponents: opponents }),
  setQuestCompleted: (data) => set({ questCompleted: data }),

  updateStamina: (newStamina) =>
    set((state) => ({
      playerState: state.playerState
        ? {
            ...state.playerState,
            player: {
              ...state.playerState.player,
              stamina_current: newStamina,
            },
          }
        : null,
    })),

  addActiveQuest: (quest) =>
    set((state) => ({
      playerState: state.playerState
        ? {
            ...state.playerState,
            active_quest:
              quest.slot_number === 1 ? quest : state.playerState.active_quest,
            queued_quests:
              quest.slot_number > 1
                ? [...state.playerState.queued_quests, quest]
                : state.playerState.queued_quests,
          }
        : null,
    })),

  removeQuest: (questId) =>
    set((state) => ({
      playerState: state.playerState
        ? {
            ...state.playerState,
            active_quest:
              state.playerState.active_quest?.id === questId
                ? null
                : state.playerState.active_quest,
            queued_quests: state.playerState.queued_quests.filter(
              (q) => q.id !== questId
            ),
          }
        : null,
    })),

  updateGold: (gold) =>
    set((state) => ({
      playerState: state.playerState
        ? {
            ...state.playerState,
            player: { ...state.playerState.player, gold },
          }
        : null,
    })),

  updateRC: (rc) =>
    set((state) => ({
      playerState: state.playerState
        ? {
            ...state.playerState,
            player: { ...state.playerState.player, rc_balance: rc },
          }
        : null,
    })),

  updateScrap: (scrap) =>
    set((state) => ({
      playerState: state.playerState
        ? {
            ...state.playerState,
            player: { ...state.playerState.player, scrap_metal: scrap },
          }
        : null,
    })),

  reset: () =>
    set({
      playerState: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      arenaOpponents: [],
      questCompleted: null,
    }),
}))