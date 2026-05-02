// =============================================
// ECHO RIFT — NOTIFICATIONS SCREEN
// =============================================
// - Ekrana girince tüm unread'ler otomatik okundu yapılır
// - Aksiyon gerektiren tipler → ilgili ekrana navigate
// - Sadece bilgi tipleri (arena/dungeon/system) → tıklanmaz, sadece bilgi

import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Animated,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'
import { ThemedAlert } from '../components/ThemedAlert'

const TYPE_ICONS: Record<string, string> = {
  // Battle (info-only, tıklanmaz)
  arena:             '🏟️',
  dungeon:           '⚔️',
  guild:             '🛡️',
  system:            '📢',
  // Aksiyon gerektiren
  friend_request:    '👋',
  friend_accepted:   '🤝',
  referral_redeemed: '🎁',
  referral_reward:   '⚡',
  energy_gift:       '⚡',
  achievement:       '🏆',
  quest_complete:    '📡',
  daily_login:       '📅',
  season_ending:     '⏳',
  mailbox:           '📬',
  stamina_full:      '🔋',
  echo_pass:         '✨',
  limited_offer:     '🎁',
  returning_player:  '👋',
}

// ✅ Sadece aksiyon gerektiren tipler — diğerleri info-only (tıklanmaz)
const TYPE_NAV: Record<string, string> = {
  friend_request:    'Friends',
  friend_accepted:   'Friends',
  referral_redeemed: 'Referral',
  referral_reward:   'Mailbox',
  // energy_gift kaldırıldı — info-only (mailbox'tan toplanıyor zaten)
  achievement:       'Achievements',
  quest_complete:    'Mailbox',
  mailbox:           'Mailbox',
  echo_pass:         'EchoPass',
  limited_offer:     'Shop',
  guild:             'Guild',
  // arena, dungeon, system → YOK (info-only, tıklanmaz)
}

const TYPE_COLOR: Record<string, string> = {
  arena:          '#B366FF',
  dungeon:        '#FF4444',
  guild:          '#FFD700',
  friend_request: '#00D4FF',
  friend_accepted:'#00FF88',
  achievement:    '#F59E0B',
  energy_gift:    '#00FF88',
  referral_reward:'#00FF88',
}

// Tab screens (Main içinde) vs Stack screens
const TAB_SCREENS = new Set(['Arena', 'Dungeon', 'Inventory', 'Ship', 'Home'])

// ─── INFO CARD: tıklanınca highlight + dim ───
function InfoCard({ item, color, onDelete, formatTime }: any) {
  const fade = useRef(new Animated.Value(1)).current

  const handlePress = () => {
    // Pulse animasyon — sadece görsel feedback
    Animated.sequence([
      Animated.timing(fade, { toValue: 0.4, duration: 100, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
  }

  return (
    <Animated.View style={{ opacity: fade }}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={[styles.iconCol, { backgroundColor: color + '18' }]}>
          <Text style={styles.typeIcon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          {item.body ? (
            <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          ) : null}
          <Text style={styles.time}>{formatTime(item.sent_at)}</Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function NotificationsScreen({ navigation }: any) {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)

  useFocusEffect(useCallback(() => { load() }, []))

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data } = await supabase.rpc('get_notifications', {
        p_player_id: user.id,
        p_limit: 50,
        p_unread_only: false,
      })
      if (data?.success) {
        setNotifications(data.notifications || [])

        // ✅ Otomatik mark all as read
        if ((data.unread_count || 0) > 0) {
          await supabase.rpc('mark_notifications_read', {
            p_player_id: user.id,
            p_notification_ids: null,
          })
        }
      }
    }
    setLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleClearAll = async () => {
    if (!userId || notifications.length === 0) {
      ThemedAlert.alert('Nothing to delete', 'No notifications.')
      return
    }
    ThemedAlert.alert('Clear All', `Delete all ${notifications.length} notifications?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          setBusy(true)
          await supabase.rpc('delete_notifications', {
            p_player_id: userId,
            p_notification_ids: null,
            p_only_read: false,
          })
          setBusy(false)
          await load()
        },
      },
    ])
  }

  const navigateToScreen = (screenName: string) => {
    if (TAB_SCREENS.has(screenName)) {
      navigation.navigate('Main', { screen: screenName })
    } else {
      navigation.navigate(screenName)
    }
  }

  const handleTapActionable = (n: any) => {
    const targetScreen = TYPE_NAV[n.type]
    if (targetScreen) {
      navigateToScreen(targetScreen)
    }
  }

  const handleDeleteSingle = async (id: string) => {
    if (!userId) return
    setBusy(true)
    await supabase.rpc('delete_notifications', {
      p_player_id: userId,
      p_notification_ids: [id],
      p_only_read: false,
    })
    setBusy(false)
    await load()
  }

  const formatTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.neonGreen as string} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
          {notifications.length > 0 && (
            <Text style={styles.headerSub}>{notifications.length} total</Text>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* CLEAR ALL */}
      {notifications.length > 0 && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleClearAll}
            disabled={busy}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.error }]}>🗑️ CLEAR ALL</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={notifications}
        keyExtractor={it => it.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const accentColor = TYPE_COLOR[item.type] || (COLORS.neonGreen as string)
          const isActionable = !!TYPE_NAV[item.type]

          // ✅ Aksiyon gerektirmeyen → InfoCard (tıklanır ama nereye gitmez, sadece pulse)
          if (!isActionable) {
            return (
              <InfoCard
                item={item}
                color={accentColor}
                onDelete={() => handleDeleteSingle(item.id)}
                formatTime={formatTime}
              />
            )
          }

          // ✅ Aksiyon gerektiren → ekrana navigate
          return (
            <TouchableOpacity
              style={[styles.card, styles.cardActionable]}
              onPress={() => handleTapActionable(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCol, { backgroundColor: accentColor + '18' }]}>
                <Text style={styles.typeIcon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
              </View>
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={[styles.tapHint, { color: accentColor }]}>›</Text>
                </View>
                {item.body ? (
                  <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                ) : null}
                <Text style={styles.time}>{formatTime(item.sent_at)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteSingle(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backText: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  headerSub: { fontSize: 9, color: COLORS.textMuted, marginTop: 3, letterSpacing: 1 },

  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  actionBtn: {
    flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 8, alignItems: 'center',
  },
  actionBtnDanger: { borderColor: COLORS.error },
  actionBtnText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  list: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 6, overflow: 'hidden', minHeight: 64,
  },
  cardActionable: {
    // Aksiyon gerektiren'lerde ufak farklı görünüm — şimdilik aynı
  },
  iconCol: {
    width: 52, alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center',
  },
  typeIcon: { fontSize: 22 },
  content: { flex: 1, padding: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  tapHint: { fontSize: 18, fontWeight: '900', marginRight: 4 },
  body: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16, marginTop: 3 },
  time: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, letterSpacing: 1 },
  deleteBtn: { padding: 12 },
  deleteIcon: { fontSize: 14, color: COLORS.textMuted },
})