// =============================================
// ECHO RIFT — PUSH NOTIFICATIONS
// =============================================

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// ✅ FIX: shouldShowBanner + shouldShowList eklendi
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
})

export async function registerForPushNotifications(userId: string) {
  try {
    if (!Device.isDevice) return null
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data
      await supabase.from('player_devices').upsert({
        player_id: userId, push_token: token,
        platform: Platform.OS, updated_at: new Date().toISOString(),
      }, { onConflict: 'player_id' })
      return token
    } catch { return null }
  } catch { return null }
}

export async function scheduleQuestNotification(questName: string, endsAt: Date, questId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(questId).catch(() => {})
    const seconds = Math.max(1, Math.floor((endsAt.getTime() - Date.now()) / 1000))
    if (seconds <= 1) return
    await Notifications.scheduleNotificationAsync({
      identifier: questId,
      content: { title: '⚡ Quest Complete!', body: `${questName} finished. Claim your rewards!`, data: { type: 'quest_complete', questId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    })
  } catch (e) { console.log('scheduleQuestNotification error:', e) }
}

export async function cancelQuestNotification(questId: string) {
  try { await Notifications.cancelScheduledNotificationAsync(questId) } catch {}
}

export async function scheduleStaminaNotification(currentStamina: number, maxStamina: number, lastUpdate: Date) {
  try {
    await Notifications.cancelScheduledNotificationAsync('stamina_full').catch(() => {})
    if (currentStamina >= maxStamina) return
    const seconds = Math.max(1, (maxStamina - currentStamina) * 1800 - Math.floor((Date.now() - lastUpdate.getTime()) / 1000))
    await Notifications.scheduleNotificationAsync({
      identifier: 'stamina_full',
      content: { title: '⚡ Stamina Full!', body: 'Your stamina is full. Time to go on a quest!', data: { type: 'stamina_full' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    })
  } catch (e) { console.log('scheduleStaminaNotification error:', e) }
}

export async function scheduleAfkFullNotification(passType: 'free' | 'silver' | 'gold', lastCollectedAt: Date) {
  try {
    await Notifications.cancelScheduledNotificationAsync('afk_full').catch(() => {})
    const maxMinutes = passType === 'gold' ? 900 : passType === 'silver' ? 750 : 600
    const elapsed    = Math.floor((Date.now() - lastCollectedAt.getTime()) / 1000 / 60)
    const seconds    = Math.max(1, (maxMinutes - elapsed) * 60)
    await Notifications.scheduleNotificationAsync({
      identifier: 'afk_full',
      content: { title: '💰 AFK Rewards Full!', body: 'Your offline rewards are maxed out. Collect now!', data: { type: 'afk_full' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    })
  } catch (e) { console.log('scheduleAfkFullNotification error:', e) }
}

export async function cancelAfkNotification() {
  try { await Notifications.cancelScheduledNotificationAsync('afk_full') } catch {}
}

export async function scheduleGuildBossNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync('guild_boss').catch(() => {})
    const now = new Date()
    const next = new Date(now)
    const daysUntilMonday = now.getDay() === 1 ? 7 : (8 - now.getDay()) % 7
    next.setDate(now.getDate() + daysUntilMonday)
    next.setHours(9, 0, 0, 0)
    const seconds = Math.max(1, Math.floor((next.getTime() - now.getTime()) / 1000))
    await Notifications.scheduleNotificationAsync({
      identifier: 'guild_boss',
      content: { title: '👾 New Guild Boss!', body: 'A new weekly boss has appeared. Attack with your guild!', data: { type: 'guild_boss' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    })
  } catch (e) { console.log('scheduleGuildBossNotification error:', e) }
}

export async function scheduleDailyReminder() {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily_reminder').catch(() => {})
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily_reminder',
      content: { title: '🎮 Echo Rift', body: "Daily rewards waiting! Don't lose your streak.", data: { type: 'daily_reminder' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 10, minute: 0 },
    })
  } catch (e) { console.log('scheduleDailyReminder error:', e) }
}

export async function scheduleDungeonResetNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync('dungeon_reset').catch(() => {})
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 5, 0, 0)
    const seconds = Math.max(1, Math.floor((tomorrow.getTime() - Date.now()) / 1000))
    await Notifications.scheduleNotificationAsync({
      identifier: 'dungeon_reset',
      content: { title: '⚔️ Dungeon Ready!', body: 'Your dungeon attempts have reset. Time to fight!', data: { type: 'dungeon_reset' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    })
  } catch (e) { console.log('scheduleDungeonResetNotification error:', e) }
}

export async function cancelAllNotifications() {
  try { await Notifications.cancelAllScheduledNotificationsAsync() } catch {}
}