// =============================================
// ECHO RIFT — GAME HOOKS
// =============================================

import { useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { PlayerState, DungeonBattleResult, ArenaBattleResult } from '../types'
import { QuestDurationKey } from '../types'
import {
  scheduleQuestNotification,
  cancelQuestNotification,
  scheduleStaminaNotification,
  registerForPushNotifications,
  scheduleDailyReminder,
} from '../lib/notifications'

// UUID generator
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const useGame = () => {
  const {
    setPlayerState,
    setLoading,
    setError,
    setArenaOpponents,
    playerState,
  } = useGameStore()

  // Push notification sadece bir kere init edilmeli
  // Her fetchPlayerState çağrısında tekrarlanmaması için ref kullan
  const pushInitDone = useRef(false)

  // =============================================
  // PLAYER STATE
  // =============================================
  const fetchPlayerState = useCallback(async (playerId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_player_state', {
        p_player_id: playerId,
      })

      if (error) throw error
      if (data?.success) {
        setPlayerState(data as PlayerState)

        // ✅ FIX: Push notification sadece ilk seferinde init edilir
        if (!pushInitDone.current) {
          pushInitDone.current = true
          await registerForPushNotifications(playerId)
          await scheduleDailyReminder()
        }

        // Stamina notification — her seferinde güncel
        if (data.player?.stamina_current < data.player?.stamina_max) {
          await scheduleStaminaNotification(
            data.player.stamina_current,
            data.player.stamina_max,
            new Date(data.player.last_stamina_update)
          )
        }
      }
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('fetchPlayerState error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // =============================================
  // QUEST BAŞLAT
  // =============================================
  const startQuest = useCallback(
    async (playerId: string, durationKey: QuestDurationKey) => {
      try {
        const idempotencyKey = `quest-${playerId}-${Date.now()}-${generateId()}`

        const { data, error } = await supabase.rpc('start_quest', {
          p_player_id: playerId,
          p_duration_key: durationKey,
          p_idempotency_key: idempotencyKey,
        })

        if (error) throw error

        // ✅ Energy mission — stamina quest başladığında harcanır
        if (data?.success) {
          const STAMINA_COSTS: Record<string, number> = {
            '15s': 1, '5m': 2, '15m': 5, '1h': 15, '4h': 25, '8h': 50
          }
          const staminaCost = STAMINA_COSTS[durationKey] || 0
          if (staminaCost > 0) {
            await supabase.rpc('update_daily_mission', {
              p_player_id: playerId,
              p_mission_type: 'energy',
              p_increment: staminaCost,
            })
          }
        }

        // Quest notification — sadece uzun questler için
        const notifiableQuests = ['15m', '1h', '4h', '8h']
        if (
          data?.success &&
          data?.ends_at &&
          data?.quest_id &&
          notifiableQuests.includes(durationKey)
        ) {
          const questNames: Record<string, string> = {
            '15m': 'Debris Field Recon',
            '1h': 'Corrupted Zone Sweep',
            '4h': 'Dark Matter Hunt',
            '8h': 'Rift Anomaly Scan',
          }
          await scheduleQuestNotification(
            questNames[durationKey] || 'Quest',
            new Date(data.ends_at),
            data.quest_id
          )
        }

        return data
      } catch (err: any) {
        setError(err.message)
        console.error('startQuest error:', err)
        return null
      }
    },
    []
  )

  // =============================================
  // QUEST İPTAL
  // =============================================
  const cancelQuest = useCallback(
    async (playerId: string, questId: string) => {
      try {
        const { data, error } = await supabase.rpc('cancel_quest', {
          p_player_id: playerId,
          p_quest_id: questId,
        })

        if (error) throw error
        await cancelQuestNotification(questId)
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('cancelQuest error:', err)
        return null
      }
    },
    []
  )

  // =============================================
  // QUEST SYNC
  // =============================================
  const syncQuestQueue = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('sync_quest_queue', {
        p_player_id: playerId,
      })

      if (error) throw error

      if (data?.completed_count > 0 && data?.completed_quests) {
        for (const q of data.completed_quests) {
          if (q.success) {
            await supabase.rpc('update_daily_mission', {
              p_player_id: playerId,
              p_mission_type: 'quest',
              p_increment: 1,
            })
            // energy mission artık startQuest'te güncelleniyor
          }
        }
      }

      return data
    } catch (err: any) {
      console.error('syncQuestQueue error:', err)
      return null
    }
  }, [])

  // =============================================
  // DUNGEON BATTLE
  // =============================================
  const dungeonBattle = useCallback(async (playerId: string) => {
    try {
      const idempotencyKey = `dungeon-${playerId}-${Date.now()}-${generateId()}`

      const { data, error } = await supabase.rpc('dungeon_battle', {
        p_player_id: playerId,
        p_idempotency_key: idempotencyKey,
      })

      if (error) throw error

      if (data?.success && data?.result === 'victory') {
        await supabase.rpc('update_daily_mission', {
          p_player_id: playerId,
          p_mission_type: 'dungeon',
          p_increment: 1,
        })
      }

      return data as DungeonBattleResult
    } catch (err: any) {
      setError(err.message)
      console.error('dungeonBattle error:', err)
      return null
    }
  }, [])

  // =============================================
  // ARENA — RAKİP LİSTESİ
  // =============================================
  const getArenaOpponents = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_arena_opponents', {
        p_player_id: playerId,
      })

      if (error) throw error
      if (data?.success) {
        setArenaOpponents(data.opponents || [])
      }
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('getArenaOpponents error:', err)
      return null
    }
  }, [])

  // =============================================
  // ARENA BATTLE
  // =============================================
  const arenaBattle = useCallback(
    async (attackerId: string, defenderId: string, isBot: boolean = false) => {
      try {
        const idempotencyKey = `arena-${attackerId}-${defenderId}-${Date.now()}`

        let data, error

        if (isBot) {
          const result = await supabase.rpc('arena_battle_bot', {
            p_attacker_id: attackerId,
            p_bot_id: defenderId,
            p_idempotency_key: idempotencyKey,
          })
          data = result.data
          error = result.error
        } else {
          const result = await supabase.rpc('arena_battle', {
            p_attacker_id: attackerId,
            p_defender_id: defenderId,
            p_idempotency_key: idempotencyKey,
          })
          data = result.data
          error = result.error
        }

        if (error) throw error

        if (data?.success) {
          await supabase.rpc('update_daily_mission', {
            p_player_id: attackerId,
            p_mission_type: 'arena',
            p_increment: 1,
          })
        }

        return data as ArenaBattleResult
      } catch (err: any) {
        setError(err.message)
        console.error('arenaBattle error:', err)
        return null
      }
    },
    []
  )

  // =============================================
  // ITEM EQUİP / UNEQUİP / AUTO
  // =============================================
  const equipItem = useCallback(
    async (playerId: string, itemId: string) => {
      try {
        const { data, error } = await supabase.rpc('equip_item', {
          p_player_id: playerId,
          p_item_id: itemId,
        })
        if (error) throw error
        await fetchPlayerState(playerId)
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('equipItem error:', err)
        return null
      }
    },
    [fetchPlayerState]
  )

  const unequipItem = useCallback(
    async (playerId: string, itemId: string) => {
      try {
        const { data, error } = await supabase.rpc('unequip_item', {
          p_player_id: playerId,
          p_item_id: itemId,
        })
        if (error) throw error
        await fetchPlayerState(playerId)
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('unequipItem error:', err)
        return null
      }
    },
    [fetchPlayerState]
  )

  const autoEquip = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('auto_equip', {
        p_player_id: playerId,
      })
      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('autoEquip error:', err)
      return null
    }
  }, [])

  // =============================================
  // DİSMANTLE
  // =============================================
  const dismantleItems = useCallback(
    async (itemIds: string[], maxRarity: string = 'Legendary') => {
      try {
        if (!playerState?.player?.id) throw new Error('No player ID')
        const { data, error } = await supabase.rpc('dismantle_items', {
          p_player_id: playerState.player.id,
          p_max_rarity: maxRarity,
          p_item_ids: itemIds,
        })
        if (error) throw error
        if (data?.success) {
          await supabase.rpc('update_daily_mission', {
            p_player_id: playerState.player.id,
            p_mission_type: 'scrap',
            p_increment: itemIds.length,
          })
        }
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('dismantleItems error:', err)
        return null
      }
    },
    [playerState]
  )

  // =============================================
  // LEADERBOARD
  // ✅ FIX: p_season_id parametresi kaldırıldı (Supabase almıyor)
  // =============================================
  const getLeaderboard = useCallback(async (type: string, playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_type: type,
        p_player_id: playerId,
      })
      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('getLeaderboard error:', err)
      return null
    }
  }, [])

  // =============================================
  // ENVANTER
  // =============================================
  const getChampions = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_champions', { p_player_id: playerId })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const getSummonBanners = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_summon_banners', { p_player_id: playerId })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const summonChampion = useCallback(async (playerId: string, bannerId: string, count: 1 | 10) => {
    try {
      const { data, error } = await supabase.rpc('summon_champion', {
        p_player_id: playerId, p_banner_id: bannerId, p_count: count,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const equipChampion = useCallback(async (playerId: string, pcId: string, slotIndex: number | null) => {
    try {
      const { data, error } = await supabase.rpc('equip_champion', {
        p_player_id: playerId, p_pc_id: pcId, p_slot_index: slotIndex,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const levelUpChampion = useCallback(async (playerId: string, pcId: string, stoneType: string) => {
    try {
      const { data, error } = await supabase.rpc('level_up_champion', {
        p_player_id: playerId, p_pc_id: pcId, p_stone_type: stoneType,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const ascendChampion = useCallback(async (playerId: string, pcId: string) => {
    try {
      const { data, error } = await supabase.rpc('ascend_champion', {
        p_player_id: playerId, p_pc_id: pcId,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const getInventory = useCallback(
    async (playerId: string, page: number = 0) => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select(`
            id, item_type, rarity, level,
            base_attack, power_score, is_equipped, is_locked, source,
            item_affixes (affix_type, value)
          `)
          .eq('player_id', playerId)
          .eq('is_pending', false)
          .order('power_score', { ascending: false })
          .range(page * 50, (page + 1) * 50 - 1)

        if (error) throw error
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('getInventory error:', err)
        return null
      }
    },
    []
  )

  // =============================================
  // MAİLBOX
  // =============================================
  const getMailbox = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from('mailbox')
        .select('*')
        .eq('player_id', playerId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('getMailbox error:', err)
      return null
    }
  }, [])

  // =============================================
  // GEMİ
  // =============================================
  const getShipState = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_ship_state', {
        p_player_id: playerId,
      })
      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('getShipState error:', err)
      return null
    }
  }, [])

  const upgradeShipModule = useCallback(
    async (playerId: string, moduleType: string) => {
      try {
        // ✅ FIX: p_idempotency_key kaldırıldı (Supabase fonksiyonu almıyor)
        const { data, error } = await supabase.rpc('upgrade_ship_module', {
          p_player_id: playerId,
          p_module_type: moduleType,
        })
        if (error) throw error
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('upgradeShipModule error:', err)
        return null
      }
    },
    []
  )

  const useShipSkill = useCallback(
    async (playerId: string, moduleType: string) => {
      try {
        const { data, error } = await supabase.rpc('use_ship_skill', {
          p_player_id: playerId,
          p_module_type: moduleType,
        })
        if (error) throw error
        return data
      } catch (err: any) {
        setError(err.message)
        console.error('useShipSkill error:', err)
        return null
      }
    },
    []
  )

  // =============================================
  // CLASS SEÇ
  // =============================================
  const selectClass = useCallback(async (playerId: string, classType: string) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .update({ class_type: classType })
        .eq('id', playerId)
        .select()

      if (error) throw error

      await supabase.rpc('update_player_stats', {
        p_player_id: playerId,
      })

      return data
    } catch (err: any) {
      setError(err.message)
      console.error('selectClass error:', err)
      return null
    }
  }, [])

  return {
    fetchPlayerState,
    startQuest,
    cancelQuest,
    syncQuestQueue,
    dungeonBattle,
    getArenaOpponents,
    arenaBattle,
    equipItem,
    unequipItem,
    autoEquip,
    dismantleItems,
    getLeaderboard,
    getInventory,
    getMailbox,
    getChampions,
    summonChampion,
    equipChampion,
    levelUpChampion,
    ascendChampion,
    getSummonBanners,
    selectClass,
    getShipState,
    upgradeShipModule,
    useShipSkill,
    playerState,
  }
}