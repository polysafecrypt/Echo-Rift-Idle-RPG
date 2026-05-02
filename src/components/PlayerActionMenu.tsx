// =============================================
// ECHO RIFT — PLAYER ACTION MENU
// Küçük popup: Username/avatar tıklanınca açılır
// View Profile / Add Friend / Report / Close
// 
// FIX: Spam koruması, friend status farkındalığı, modal stack temizliği
// =============================================

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Pressable,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'
import { ThemedAlert } from './ThemedAlert'
import { ReportModal } from './ReportModal'

type Props = {
  visible: boolean
  onClose: () => void
  targetPlayerId: string
  targetUsername: string
  targetClassType?: string | null
  targetLevel?: number | null
  navigation: any
  currentUserId: string | null
}

type FriendStatus = 'none' | 'friends' | 'pending_outgoing' | 'pending_incoming' | 'unknown'

export function PlayerActionMenu({
  visible, onClose, targetPlayerId, targetUsername, targetClassType, targetLevel,
  navigation, currentUserId,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('unknown')
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const navigatingRef = useRef(false)  // Spam koruması: View Profile

  const isSelf = currentUserId === targetPlayerId

  // Friend status çek (visible olunca)
  useEffect(() => {
    if (!visible || isSelf || !currentUserId) return
    
    let cancelled = false
    setStatusLoading(true)
    setFriendStatus('unknown')
    setPendingRequestId(null)

    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('get_player_profile', {
          p_target_id: targetPlayerId,
          p_viewer_id: currentUserId,
        })
        if (cancelled) return
        if (!error && data?.success && data.profile) {
          setFriendStatus(data.profile.friend_status || 'none')
          setPendingRequestId(data.profile.friend_request_id || null)
        } else {
          setFriendStatus('none')  // güvenli default
        }
      } catch {
        if (!cancelled) setFriendStatus('none')
      } finally {
        if (!cancelled) setStatusLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [visible, isSelf, currentUserId, targetPlayerId])

  // Modal kapanınca state reset (sonraki açılış temiz olsun)
  useEffect(() => {
    if (!visible) {
      navigatingRef.current = false
      setBusy(false)
      setReportOpen(false)
    }
  }, [visible])

  const handleViewProfile = () => {
    if (busy || navigatingRef.current) return
    navigatingRef.current = true
    onClose()
    // Doğrudan navigate, setTimeout yok — Modal kapatma animasyonu navigation ile çakışmıyor
    navigation.navigate('PlayerProfile', { playerId: targetPlayerId })
  }

  const handleAddFriend = async () => {
    if (!currentUserId || isSelf || busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_player_id: currentUserId,
        p_target_player_id: targetPlayerId,
        p_target_username: null,
      })
      if (error) {
        ThemedAlert.alert('Error', error.message)
        return
      }
      if (!data?.success) {
        const msgs: Record<string, string> = {
          ALREADY_FRIENDS:    'You are already friends.',
          REQUEST_PENDING:    'Friend request already pending.',
          MAX_FRIENDS:        'Friend list is full (max 15).',
          PLAYER_NOT_FOUND:   'Player not found.',
          CANNOT_FRIEND_SELF: "You can't send a friend request to yourself.",
        }
        ThemedAlert.alert('Cannot Send', msgs[data?.error] || data?.error || 'Failed')
        // Status'u yenile (belki arkadaş olmuşlardır)
        if (data?.error === 'ALREADY_FRIENDS') setFriendStatus('friends')
        if (data?.error === 'REQUEST_PENDING') setFriendStatus('pending_outgoing')
        return
      }
      setFriendStatus('pending_outgoing')
      ThemedAlert.alert('Sent!', `Friend request sent to ${targetUsername}`)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!currentUserId || !pendingRequestId || busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        p_player_id: currentUserId,
        p_request_id: pendingRequestId,
      })
      if (error) {
        ThemedAlert.alert('Error', error.message)
        return
      }
      if (!data?.success) {
        ThemedAlert.alert('Cannot Accept', data?.error || 'Failed')
        return
      }
      setFriendStatus('friends')
      ThemedAlert.alert('Friends!', `You and ${targetUsername} are now friends.`)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleReport = () => {
    if (busy) return
    setReportOpen(true)
  }

  const handleReportClose = () => {
    setReportOpen(false)
    onClose()  // Report modal kapanınca tüm akışı kapat
  }

  if (!visible) return null

  // ─── Friend butonu render ─────────────────────────────────
  const renderFriendButton = () => {
    if (isSelf) return null
    if (statusLoading) {
      return (
        <View style={styles.btn}>
          <ActivityIndicator color={COLORS.textMuted} size="small" />
          <Text style={[styles.btnText, { color: COLORS.textMuted }]}>Loading...</Text>
        </View>
      )
    }

    if (friendStatus === 'friends') {
      return (
        <View style={[styles.btn, { opacity: 0.6 }]}>
          <Text style={styles.btnIcon}>🤝</Text>
          <Text style={[styles.btnText, { color: COLORS.neonGreen as string }]}>Already Friends</Text>
        </View>
      )
    }

    if (friendStatus === 'pending_outgoing') {
      return (
        <View style={[styles.btn, { opacity: 0.6 }]}>
          <Text style={styles.btnIcon}>⏳</Text>
          <Text style={[styles.btnText, { color: '#F59E0B' }]}>Request Sent</Text>
        </View>
      )
    }

    if (friendStatus === 'pending_incoming') {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleAcceptRequest}
          disabled={busy}
        >
          <Text style={styles.btnIcon}>{busy ? '⏳' : '✓'}</Text>
          <Text style={[styles.btnText, { color: COLORS.neonGreen as string }]}>
            {busy ? 'Accepting...' : 'Accept Request'}
          </Text>
        </TouchableOpacity>
      )
    }

    // 'none' veya 'unknown' → Add Friend butonu
    return (
      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary]}
        onPress={handleAddFriend}
        disabled={busy}
      >
        <Text style={styles.btnIcon}>{busy ? '⏳' : '➕'}</Text>
        <Text style={[styles.btnText, { color: COLORS.neonGreen as string }]}>
          {busy ? 'Sending...' : 'Add Friend'}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <>
      <Modal
        visible={visible && !reportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!busy) onClose() }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => { if (!busy) onClose() }}
        >
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.username}>{targetUsername}</Text>
              {!!(targetClassType || targetLevel) && (
                <Text style={styles.subtitle}>
                  {targetClassType ? targetClassType.toUpperCase() : ''}
                  {targetClassType && targetLevel ? '  •  ' : ''}
                  {targetLevel ? `LV ${targetLevel}` : ''}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* VIEW PROFILE */}
            <TouchableOpacity style={styles.btn} onPress={handleViewProfile} disabled={busy}>
              <Text style={styles.btnIcon}>👤</Text>
              <Text style={styles.btnText}>View Profile</Text>
            </TouchableOpacity>

            {/* FRIEND BUTTON (durum-bazlı) */}
            {renderFriendButton()}

            {/* REPORT (kendi değilse) */}
            {!isSelf && (
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={handleReport}
                disabled={busy}
              >
                <Text style={styles.btnIcon}>🚩</Text>
                <Text style={[styles.btnText, { color: COLORS.error }]}>Report</Text>
              </TouchableOpacity>
            )}

            {/* CLOSE */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => { if (!busy) onClose() }}
              disabled={busy}
            >
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Modal — yalnızca açıkken render */}
      {reportOpen && currentUserId && (
        <ReportModal
          visible={reportOpen}
          onClose={handleReportClose}
          targetPlayerId={targetPlayerId}
          targetUsername={targetUsername}
          reporterId={currentUserId}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menu: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,212,255,0.3)',
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,212,255,0.06)',
  },
  username: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginTop: 4,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  btnPrimary: {
    backgroundColor: 'rgba(0,255,136,0.06)',
  },
  btnDanger: {
    backgroundColor: 'rgba(255,68,68,0.06)',
  },
  btnIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    fontWeight: '700',
  },
})