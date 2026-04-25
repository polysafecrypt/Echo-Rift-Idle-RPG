// =============================================
// ECHO RIFT — MAILBOX SCREEN
// =============================================

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { COLORS, RARITY_COLORS } from '../constants'
import { Rarity } from '../types'

const { width } = Dimensions.get('window')

const SLOT_ICONS: Record<string, string> = {
  sword: '🗡️', helmet: '🪖', chest: '🛡️',
  gloves: '🧤', crystal: '💎',
}

export default function MailboxScreen({ navigation }: any) {
  const [messages, setMessages] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [])
  )

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)

      const { data } = await supabase
        .from('mailbox')
        .select(`
          id, title, description, source, status, created_at, item_id,
          items (
            id, item_type, rarity, level, power_score, base_attack,
            item_affixes (affix_type, value)
          )
        `)
        .eq('player_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setMessages(data)

      // Item olmayan pending mesajları otomatik okundu yap
      await supabase
        .from('mailbox')
        .update({ status: 'collected', collected_at: new Date().toISOString() })
        .eq('player_id', user.id)
        .eq('status', 'pending')
        .is('item_id', null)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleCollectItem = async (message: any) => {
    if (!userId || !message.item_id) return
    try {
      setLoading(true)

      const { data: player } = await supabase
        .from('players')
        .select('inventory_count')
        .eq('id', userId)
        .single()

      if (player && player.inventory_count >= 200) {
        Alert.alert('Inventory Full', 'Dismantle some items first.')
        return
      }

      const { error: itemError } = await supabase
        .from('items')
        .update({ is_pending: false })
        .eq('id', message.item_id)
        .eq('player_id', userId)

      if (itemError) {
        Alert.alert('Error', 'Failed: ' + itemError.message)
        return
      }

      await supabase
        .from('players')
        .update({ inventory_count: (player?.inventory_count || 0) + 1 })
        .eq('id', userId)

      await supabase
        .from('mailbox')
        .update({ status: 'collected', collected_at: new Date().toISOString() })
        .eq('id', message.id)

      await loadData()
      Alert.alert('Collected!', 'Item added to inventory.')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCollectAll = async () => {
    if (!userId) return
    const itemMessages = messages.filter(m => m.item_id && m.status === 'pending')
    if (itemMessages.length === 0) {
      Alert.alert('No items', 'No items to collect.')
      return
    }
    Alert.alert('Collect All', `Collect ${itemMessages.length} items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Collect All',
        onPress: async () => {
          setLoading(true)
          for (const msg of itemMessages) {
            await handleCollectItem(msg)
          }
          setLoading(false)
        }
      }
    ])
  }

  const handleDeleteRead = async () => {
    if (!userId) return
    const readMessages = messages.filter(m => m.status === 'collected')
    if (readMessages.length === 0) {
      Alert.alert('Nothing to delete', 'No read messages.')
      return
    }
    Alert.alert('Delete Read', `Delete ${readMessages.length} read messages?`, [
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
    if (message.item_id && message.status !== 'collected') {
      Alert.alert('Cannot Delete', 'Collect the item first.')
      return
    }
    Alert.alert('Delete', 'Delete this message?', [
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

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'arena': return '🏆'
      case 'dungeon': return '⚔️'
      case 'quest': return '📡'
      case 'system': return '📢'
      default: return '📬'
    }
  }

  const formatTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const pendingItemCount = messages.filter(m => m.item_id && m.status === 'pending').length
  const unreadCount = messages.filter(m => m.status === 'pending').length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MAILBOX</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
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
        renderItem={({ item }) => (
          <View style={[
            styles.messageCard,
            item.status === 'collected' && styles.messageCardRead,
          ]}>
            {item.status === 'pending' && (
              <View style={styles.accent} />
            )}

            <View style={styles.messageContent}>
              <View style={styles.titleRow}>
                <Text style={styles.sourceIcon}>{getSourceIcon(item.source)}</Text>
                <Text style={[
                  styles.messageTitle,
                  item.status === 'collected' && { color: COLORS.textMuted }
                ]}>
                  {item.title}
                </Text>
                {item.status === 'pending' && (
                  <View style={styles.unreadDot} />
                )}
                <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
                <TouchableOpacity onPress={() => handleDeleteSingle(item)}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>

              {item.description ? (
                <Text style={styles.messageDesc}>{item.description}</Text>
              ) : null}

              {item.items ? (
                <View style={[
                  styles.itemPreview,
                  { borderColor: RARITY_COLORS[item.items.rarity as Rarity] + '60' },
                  item.status === 'collected' && { opacity: 0.5 }
                ]}>
                  <Text style={styles.itemIcon}>
                    {SLOT_ICONS[item.items.item_type] || '❓'}
                  </Text>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemRarity, { color: RARITY_COLORS[item.items.rarity as Rarity] }]}>
                      {item.items.rarity.toUpperCase()}
                    </Text>
                    <Text style={styles.itemType}>
                      {item.items.item_type.toUpperCase()} • Lv.{item.items.level}
                    </Text>
                  </View>
                  <Text style={[styles.itemPower, { color: RARITY_COLORS[item.items.rarity as Rarity] }]}>
                    {item.items.power_score}
                  </Text>
                </View>
              ) : null}

              {item.item_id && item.status === 'pending' ? (
                <TouchableOpacity
                  style={styles.collectBtn}
                  onPress={() => handleCollectItem(item)}
                  disabled={loading}
                >
                  <Text style={styles.collectBtnText}>
                    {loading ? '...' : '📥 COLLECT ITEM'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {item.item_id && item.status === 'collected' ? (
                <Text style={styles.collectedText}>✓ Collected</Text>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* Alt butonlar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteRead}>
          <Text style={styles.deleteAllText}>🗑️ DELETE READ</Text>
        </TouchableOpacity>
        {pendingItemCount > 0 && (
          <TouchableOpacity style={styles.collectAllBtn} onPress={handleCollectAll}>
            <Text style={styles.collectAllText}>
              📥 COLLECT ALL ({pendingItemCount})
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backText: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    marginTop: 3,
  },
  headerBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 1 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.error,
    marginLeft: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  messageCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', overflow: 'hidden', marginBottom: 8,
  },
  messageCardRead: { opacity: 0.6 },
  accent: { width: 4, backgroundColor: COLORS.neonGreen },
  messageContent: { flex: 1, padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sourceIcon: { fontSize: 16 },
  messageTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  messageTime: { fontSize: 9, color: COLORS.textMuted },
  deleteIcon: { fontSize: 16, paddingLeft: 4 },
  messageDesc: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 18 },
  itemPreview: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgPanel, borderRadius: 8,
    borderWidth: 1, padding: 10, gap: 10, marginBottom: 8,
  },
  itemIcon: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemRarity: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  itemType: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  itemPower: { fontSize: 16, fontWeight: '900' },
  collectBtn: {
    backgroundColor: COLORS.neonGreen, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
  },
  collectBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.bg },
  collectedText: { fontSize: 11, color: COLORS.neonGreen },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 8,
    padding: 16, paddingBottom: 32,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  deleteAllBtn: {
    flex: 1, borderWidth: 1, borderColor: COLORS.error,
    borderRadius: 8, padding: 14, alignItems: 'center',
  },
  deleteAllText: { fontSize: 12, color: COLORS.error, fontWeight: '700', letterSpacing: 1 },
  collectAllBtn: {
    flex: 1, backgroundColor: COLORS.neonGreen,
    borderRadius: 8, padding: 14, alignItems: 'center',
  },
  collectAllText: { fontSize: 12, color: COLORS.bg, fontWeight: '800', letterSpacing: 1 },
})