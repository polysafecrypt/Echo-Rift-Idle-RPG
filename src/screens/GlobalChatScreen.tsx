// =============================================
// ECHO RIFT — GLOBAL CHAT SCREEN
// Supabase Realtime ile canlı mesajlaşma
// =============================================

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar,
  Dimensions, Alert,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { COLORS, CLASS_INFO } from '../constants'
import { ClassType } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'
import { PlayerActionMenu } from '../components/PlayerActionMenu'

const { width } = Dimensions.get('window')
const CORNER = 8

// ─── CLASS RENKLERİ ──────────────────────────────────────────────────────────
const getClassColor = (classType: string | null) => {
  if (!classType) return '#888'
  return CLASS_INFO[classType as ClassType]?.color || '#888'
}

const getClassIcon = (classType: string | null) => {
  if (!classType) return '👤'
  return CLASS_INFO[classType as ClassType]?.icon || '👤'
}

// ─── MESAJ BALONU ────────────────────────────────────────────────────────────
function MessageBubble({ item, isMe, onPlayerPress }: { item: any; isMe: boolean; onPlayerPress?: (p: any) => void }) {
  const classColor = getClassColor(item.class_type)
  const classIcon  = getClassIcon(item.class_type)

  const timeStr = (() => {
    const d = new Date(item.created_at)
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  })()

  if (isMe) {
    return (
      <View style={styles.rowMe}>
        <View style={styles.bubbleMe}>
          <View style={[styles.cornerMe, styles.cTL, { borderColor: classColor }]} />
          <View style={[styles.cornerMe, styles.cTR, { borderColor: classColor }]} />
          <View style={[styles.cornerMe, styles.cBL, { borderColor: classColor }]} />
          <View style={[styles.cornerMe, styles.cBR, { borderColor: classColor }]} />
          <Text style={styles.msgText}>{item.message}</Text>
          <Text style={styles.msgTime}>{timeStr}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.rowOther}>
      {/* Avatar — tıklanabilir */}
      <TouchableOpacity
        onPress={() => onPlayerPress && onPlayerPress(item)}
        activeOpacity={0.7}
        disabled={!onPlayerPress}
      >
        <View style={[styles.avatar, { borderColor: classColor + '80' }]}>
          <Text style={styles.avatarIcon}>{classIcon}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.bubbleOtherWrap}>
        {/* Kullanıcı adı + level — tıklanabilir */}
        <TouchableOpacity
          onPress={() => onPlayerPress && onPlayerPress(item)}
          activeOpacity={0.7}
          disabled={!onPlayerPress}
        >
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: classColor }]}>
              {item.username}
            </Text>
            <Text style={styles.userLevel}>Lv.{item.level}</Text>
          </View>
        </TouchableOpacity>

        {/* Mesaj */}
        <View style={styles.bubbleOther}>
          <Text style={styles.msgText}>{item.message}</Text>
          <Text style={styles.msgTime}>{timeStr}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── ANA EKRAN ───────────────────────────────────────────────────────────────
export default function GlobalChatScreen({ navigation }: any) {
  const { playerState } = useGameStore()
  const [userId,    setUserId]    = useState<string | null>(null)
  const [messages,  setMessages]  = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [sending,   setSending]   = useState(false)
  const [actionMenuPlayer, setActionMenuPlayer] = useState<any | null>(null)
  const [onlineCount, setOnlineCount] = useState(0)

  const flatListRef   = useRef<FlatList>(null)
  const channelRef    = useRef<any>(null)
  const isMountedRef  = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Realtime kanalını temizle
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  useFocusEffect(useCallback(() => {
    loadMessages()
    setupRealtime()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, []))

  const loadMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isMountedRef.current) return
    setUserId(user.id)

    const { data } = await supabase.rpc('get_global_chat', { p_limit: 50 })
    if (data?.success && isMountedRef.current) {
      setMessages(data.messages || [])
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100)
    }
  }

  const setupRealtime = async () => {
    // Önceki kanalı temizle
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current)
    }

    // Yeni kanal
    const channel = supabase
      .channel('global_chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_chat' },
        (payload) => {
          if (!isMountedRef.current) return
          const newMsg = payload.new as any
          setMessages(prev => {
            // Duplicate kontrol (gerçek id ile)
            if (prev.some(m => m.id === newMsg.id)) return prev
            // Kendi gönderdiğimiz temp mesajı varsa sil, gerçeğini koy
            const filtered = prev.filter(m =>
              !(m.id.startsWith('temp-') && m.player_id === newMsg.player_id && m.message === newMsg.message)
            )
            return [...filtered, newMsg]
          })
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)
        }
      )
      .on('presence', { event: 'sync' }, () => {
        if (!isMountedRef.current) return
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userId) {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() })
        }
      })

    channelRef.current = channel
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || !userId || sending) return

    if (text.length > 200) {
      ThemedAlert.alert('Too long', 'Max 200 characters')
      return
    }

    setSending(true)
    setInputText('')

    // ✅ Optimistic update: mesajı hemen göster, subscription geç gelse de fark etmez
    const player = playerState?.player
    const tempMsg = {
      id: `temp-${Date.now()}`,
      player_id: userId,
      username:   player?.username ?? 'You',
      class_type: player?.class_type ?? null,
      level:      player?.level ?? 1,
      message:    text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)

    const { data } = await supabase.rpc('send_global_message', {
      p_player_id: userId,
      p_message:   text,
    })

    setSending(false)

    if (!data?.success) {
      // Başarısızsa optimistic mesajı geri al
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      const errMsg =
        data?.error === 'SLOW_DOWN' ? 'Wait 3 seconds between messages!' :
        data?.error === 'TOO_LONG'  ? 'Message too long!' :
        data?.error || 'Failed to send'
      ThemedAlert.alert('Error', errMsg)
      setInputText(text) // geri koy
    }
    // Başarılıysa: subscription gerçek mesajı getirince temp msg silinir
    // (duplicate kontrol zaten var: prev.some(m => m.id === newMsg.id))
    // Temp id ile real id farklı olacak — temp'i sil, real'i ekle
  }

  const player     = playerState?.player
  const classColor = getClassColor(player?.class_type || null)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>GLOBAL CHAT</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>
              {onlineCount > 0 ? `${onlineCount} online` : 'live'}
            </Text>
          </View>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* MESAJLAR */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No messages yet.</Text>
              <Text style={styles.emptyText}>Be the first to say something!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MessageBubble item={item} isMe={item.player_id === userId} onPlayerPress={(p) => { if (p.player_id !== userId) setActionMenuPlayer(p) }} />
          )}
        />

        {/* INPUT */}
        <View style={styles.inputWrap}>
          {/* Kullanıcı avatarı */}
          <View style={[styles.inputAvatar, { borderColor: classColor + '80' }]}>
            <Text style={{ fontSize: 16 }}>{getClassIcon(player?.class_type || null)}</Text>
          </View>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Say something..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={200}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            style={[styles.sendBtn, { borderColor: classColor }, (sending || !inputText.trim()) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
          >
            <Text style={[styles.sendBtnText, { color: classColor }]}>
              {sending ? '...' : 'SEND'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* PlayerActionMenu — başkasının username/avatar'ına tıklanınca */}
      {!!(actionMenuPlayer) && (
        <PlayerActionMenu
          visible={!!actionMenuPlayer}
          onClose={() => setActionMenuPlayer(null)}
          targetPlayerId={actionMenuPlayer.player_id}
          targetUsername={actionMenuPlayer.username}
          targetClassType={actionMenuPlayer.class_type}
          targetLevel={actionMenuPlayer.level}
          navigation={navigation}
          currentUserId={userId}
        />
      )}
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A0F' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)',
    backgroundColor: 'rgba(0,8,18,0.95)',
  },
  backText:      { fontSize: 12, color: '#fff', letterSpacing: 1, width: 60 },
  headerCenter:  { alignItems: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  onlineRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  onlineDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF88' },
  onlineText:    { fontSize: 9, color: '#00FF88', letterSpacing: 1 },

  list: { padding: 12, gap: 10, paddingBottom: 8 },

  // Benim mesajım — sağ
  rowMe: { alignItems: 'flex-end', marginBottom: 6 },
  bubbleMe: {
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
    borderRadius: 4, padding: 10,
    maxWidth: width * 0.72,
    position: 'relative',
  },

  // Diğer mesaj — sol
  rowOther:        { flexDirection: 'row', gap: 8, marginBottom: 6 },
  avatar:          { width: 34, height: 34, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  avatarIcon:      { fontSize: 18 },
  bubbleOtherWrap: { flex: 1, maxWidth: width * 0.72 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  userName:        { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  userLevel:       { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  bubbleOther:     {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4, padding: 10,
  },

  msgText:  { fontSize: 13, color: '#fff', lineHeight: 18 },
  msgTime:  { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 4, textAlign: 'right' },

  // Hologram köşeler
  cornerMe: { position: 'absolute', width: CORNER, height: CORNER },
  cTL: { top: -1, left: -1,   borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cTR: { top: -1, right: -1,  borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cBL: { bottom: -1, left: -1,  borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cBR: { bottom: -1, right: -1, borderBottomWidth: 1.5, borderRightWidth: 1.5 },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,212,255,0.1)',
    backgroundColor: 'rgba(0,8,18,0.95)',
  },
  inputAvatar: { width: 34, height: 34, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
    borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8,
    color: '#fff', fontSize: 14,
  },
  sendBtn: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sendBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
})