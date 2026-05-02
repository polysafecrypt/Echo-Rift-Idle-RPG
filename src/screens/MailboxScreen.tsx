// =============================================
// ECHO RIFT — MAILBOX SCREEN (FİXED)
// =============================================
// Düzeltmeler:
// 1. Enerji/gold/rc/scroll mailler artık collect_mailbox_reward RPC çağırıyor
// 2. Enerji mailler için "COLLECT" butonu gösteriliyor
// 3. loadData'da otomatik collect kaldırıldı (enerji kayboluyordu)
// 4. collected_at → claimed_at düzeltildi
// 5. friend_gift ve referral_milestone için reward göstergesi eklendi

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { COLORS, RARITY_COLORS } from '../constants'
import { Rarity } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'

const { width } = Dimensions.get('window')

const SLOT_ICONS: Record<string, string> = {
  sword: '🗡️', helmet: '🪖', chest: '🛡️',
  gloves: '🧤', crystal: '💎', necklace: '📿',
}

const REWARD_ICONS: Record<string, string> = {
  energy: '⚡',
  gold: '🪙',
  rc: '💎',
  scroll: '📜',
  scrap: '🔩',
}

const SOURCE_ICONS: Record<string, string> = {
  arena: '🏆',
  dungeon: '⚔️',
  quest: '📡',
  system: '📢',
  friend_gift: '🎁',
  referral_milestone: '🤝',
  referral_redeemed: '🤝',
  guild: '🛡️',
}

export default function MailboxScreen({ navigation }: any) {
  const [messages, setMessages] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(false)

  useFocusEffect(useCallback(() => { loadData() }, []))

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('mailbox')
      .select(`
        id, title, description, source, status, created_at,
        item_id, reward_type, reward_amount, from_player_id, claimed_at,
        items (
          id, item_type, rarity, level, power_score, base_attack,
          item_affixes (affix_type, value)
        )
      `)
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setMessages(data)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // ✅ FIX: Tüm reward tipleri (energy dahil) collect_mailbox_reward RPC'si ile toplanıyor
  const handleCollectReward = async (message: any) => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('collect_mailbox_reward', {
        p_player_id: userId,
        p_mail_id: message.id,
      })

      if (error) {
        ThemedAlert.alert('Error', error.message)
        return
      }

      if (!data?.success) {
        const errMessages: Record<string, string> = {
          ALREADY_CLAIMED: 'Already collected.',
          EXPIRED: 'This reward has expired.',
          MAIL_NOT_FOUND: 'Mail not found.',
          NOT_YOUR_MAIL: 'This mail is not yours.',
          USE_ITEM_COLLECT_FLOW: 'Use the item collect button.',
          UNKNOWN_REWARD_TYPE: 'Unknown reward type.',
        }
        ThemedAlert.alert('Cannot Collect', errMessages[data?.error] || data?.error || 'Failed')
        return
      }

      // Başarılı — ödül tipine göre mesaj
      const icon = REWARD_ICONS[data.reward_type] || '🎁'
      const amount = data.reward_amount || 0
      ThemedAlert.alert('Collected!', `${icon} +${amount} ${(data.reward_type || '').toUpperCase()}`)
      await loadData()
    } finally {
      setLoading(false)
    }
  }

  // Item collect (is_pending=false yapıyor)
  const handleCollectItem = async (message: any) => {
    if (!userId || !message.item_id) return
    setLoading(true)
    try {
      const { data: player } = await supabase
        .from('players')
        .select('inventory_count')
        .eq('id', userId)
        .single()

      if (player && player.inventory_count >= 200) {
        ThemedAlert.alert('Inventory Full', 'Dismantle some items first.')
        return
      }

      const { error: itemError } = await supabase
        .from('items')
        .update({ is_pending: false })
        .eq('id', message.item_id)
        .eq('player_id', userId)

      if (itemError) {
        ThemedAlert.alert('Error', itemError.message)
        return
      }

      await supabase
        .from('players')
        .update({ inventory_count: (player?.inventory_count || 0) + 1 })
        .eq('id', userId)

      await supabase
        .from('mailbox')
        .update({ status: 'collected', claimed_at: new Date().toISOString() })
        .eq('id', message.id)

      await loadData()
      ThemedAlert.alert('Collected!', 'Item added to inventory.')
    } finally {
      setLoading(false)
    }
  }

  const handleCollectAll = async () => {
    if (!userId) return
    const collectables = messages.filter(m => m.status === 'pending')
    if (collectables.length === 0) {
      ThemedAlert.alert('Nothing to collect', 'No pending rewards.')
      return
    }
    ThemedAlert.alert('Collect All', `Collect ${collectables.length} rewards?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Collect All',
        onPress: async () => {
          setLoading(true)
          for (const msg of collectables) {
            if (msg.item_id) {
              await handleCollectItem(msg)
            } else {
              await supabase.rpc('collect_mailbox_reward', {
                p_player_id: userId,
                p_mail_id: msg.id,
              })
            }
          }
          await loadData()
          setLoading(false)
          ThemedAlert.alert('Done!', 'All rewards collected.')
        }
      }
    ])
  }

  const handleDeleteRead = async () => {
    if (!userId) return
    const read = messages.filter(m => m.status === 'collected')
    if (read.length === 0) {
      ThemedAlert.alert('Nothing to delete', 'No collected messages.')
      return
    }
    ThemedAlert.alert('Delete Read', `Delete ${read.length} collected messages?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('mailbox')
            .delete()
            .eq('player_id', userId)
            .eq('status', 'collected')
          await loadData()
        }
      }
    ])
  }

  const handleDeleteSingle = async (message: any) => {
    if (message.status === 'pending') {
      ThemedAlert.alert('Cannot Delete', 'Collect the reward first.')
      return
    }
    ThemedAlert.alert('Delete', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('mailbox').delete().eq('id', message.id)
          await loadData()
        }
      }
    ])
  }

  const formatTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const pendingCount = messages.filter(m => m.status === 'pending').length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MAILBOX</Text>
          {pendingCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{pendingCount} unread</Text>
            </View>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Mailbox is empty</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCollected = item.status === 'collected'
          const hasReward = !!item.reward_type && !item.item_id
          const hasItem = !!item.item_id
          const rewardIcon = REWARD_ICONS[item.reward_type] || '🎁'
          const sourceIcon = SOURCE_ICONS[item.source] || '📬'

          return (
            <View style={[styles.card, isCollected && styles.cardRead]}>
              {!isCollected && <View style={styles.accent} />}

              <View style={styles.cardContent}>
                {/* Başlık satırı */}
                <View style={styles.titleRow}>
                  <Text style={styles.sourceIcon}>{sourceIcon}</Text>
                  <Text style={[styles.cardTitle, isCollected && { color: COLORS.textMuted }]}
                    numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!isCollected && <View style={styles.unreadDot} />}
                  <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
                  <TouchableOpacity onPress={() => handleDeleteSingle(item)}>
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {/* Açıklama */}
                {item.description ? (
                  <Text style={styles.cardDesc}>{item.description}</Text>
                ) : null}

                {/* ✅ Reward göstergesi (enerji, gold, rc, scroll) */}
                {hasReward && (
                  <View style={[styles.rewardBox, isCollected && { opacity: 0.5 }]}>
                    <Text style={styles.rewardIcon}>{rewardIcon}</Text>
                    <Text style={styles.rewardText}>
                      +{item.reward_amount} {(item.reward_type || '').toUpperCase()}
                    </Text>
                    {item.source === 'friend_gift' && (
                      <Text style={styles.rewardSub}>from a friend</Text>
                    )}
                    {item.source === 'referral_milestone' && (
                      <Text style={styles.rewardSub}>referral reward</Text>
                    )}
                  </View>
                )}

                {/* Item göstergesi */}
                {hasItem && item.items ? (
                  <View style={[
                    styles.itemPreview,
                    { borderColor: RARITY_COLORS[item.items.rarity as Rarity] + '60' },
                    isCollected && { opacity: 0.5 },
                  ]}>
                    <Text style={styles.itemIcon}>{SLOT_ICONS[item.items.item_type] || '❓'}</Text>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemRarity, { color: RARITY_COLORS[item.items.rarity as Rarity] }]}>
                        {item.items.rarity.toUpperCase()}
                      </Text>
                      <Text style={styles.itemType}>
                        {item.items.item_type.toUpperCase()} • Lv.{item.items.level}
                      </Text>
                    </View>
                    <Text style={[styles.itemPower, { color: RARITY_COLORS[item.items.rarity as Rarity] }]}>
                      ⚡{item.items.power_score}
                    </Text>
                  </View>
                ) : null}

                {/* ✅ COLLECT butonu — hem enerji/gold/rc hem item için */}
                {!isCollected && hasReward && (
                  <TouchableOpacity
                    style={styles.collectBtn}
                    onPress={() => handleCollectReward(item)}
                    disabled={loading}
                  >
                    <Text style={styles.collectBtnText}>
                      {loading ? '...' : `${rewardIcon} COLLECT`}
                    </Text>
                  </TouchableOpacity>
                )}

                {!isCollected && hasItem && (
                  <TouchableOpacity
                    style={styles.collectBtn}
                    onPress={() => handleCollectItem(item)}
                    disabled={loading}
                  >
                    <Text style={styles.collectBtnText}>
                      {loading ? '...' : '📥 COLLECT ITEM'}
                    </Text>
                  </TouchableOpacity>
                )}

                {isCollected && (
                  <Text style={styles.collectedText}>✓ Collected</Text>
                )}
              </View>
            </View>
          )
        }}
      />

      {/* Alt butonlar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteRead}>
          <Text style={styles.deleteAllText}>🗑️ DELETE READ</Text>
        </TouchableOpacity>
        {pendingCount > 0 && (
          <TouchableOpacity style={styles.collectAllBtn} onPress={handleCollectAll} disabled={loading}>
            <Text style={styles.collectAllText}>
              📥 COLLECT ALL ({pendingCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backText: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1, width: 60 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  headerBadge: {
    backgroundColor: COLORS.error, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 3,
  },
  headerBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  list: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 8, flexDirection: 'row', overflow: 'hidden',
  },
  cardRead: { opacity: 0.7 },
  accent: { width: 3, backgroundColor: COLORS.neonGreen as string },
  cardContent: { flex: 1, padding: 12 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sourceIcon: { fontSize: 16 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  unreadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: COLORS.neonGreen as string,
  },
  cardTime: { fontSize: 9, color: COLORS.textMuted },
  deleteIcon: { fontSize: 14, marginLeft: 4 },
  cardDesc: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 16 },

  // Reward box
  rewardBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,255,136,0.25)',
    borderRadius: 6, padding: 8, marginBottom: 8,
  },
  rewardIcon: { fontSize: 20 },
  rewardText: { fontSize: 15, fontWeight: '900', color: COLORS.neonGreen as string },
  rewardSub: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },

  // Item preview
  itemPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 6, padding: 8, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  itemIcon: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemRarity: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  itemType: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemPower: { fontSize: 13, fontWeight: '900' },

  // Collect
  collectBtn: {
    backgroundColor: COLORS.neonGreen as string,
    borderRadius: 6, padding: 10, alignItems: 'center',
  },
  collectBtnText: { fontSize: 12, fontWeight: '900', color: COLORS.bg, letterSpacing: 1 },
  collectedText: { fontSize: 11, color: COLORS.neonGreen as string, fontWeight: '700' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 8, padding: 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  deleteAllBtn: {
    flex: 1, borderWidth: 1, borderColor: COLORS.error,
    borderRadius: 6, padding: 12, alignItems: 'center',
  },
  deleteAllText: { fontSize: 11, color: COLORS.error, fontWeight: '700', letterSpacing: 1 },
  collectAllBtn: {
    flex: 2, backgroundColor: COLORS.neonGreen as string,
    borderRadius: 6, padding: 12, alignItems: 'center',
  },
  collectAllText: { fontSize: 11, color: COLORS.bg, fontWeight: '900', letterSpacing: 1 },
})