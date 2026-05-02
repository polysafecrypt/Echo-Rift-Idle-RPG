// =============================================
// ECHO RIFT — REFERRAL SCREEN
// =============================================

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Modal, TextInput, Share,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGame } from '../hooks/useGame'
import { COLORS } from '../constants'
import { ThemedAlert } from '../components/ThemedAlert'

// Public IP fetcher (anti-abuse için backend'e gönderilir, IP başına 5 cap)
async function fetchPublicIP(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data?.ip || null
  } catch {
    return null
  }
}

export default function ReferralScreen({ navigation }: any) {
  const { getReferralSummary, redeemReferralCode } = useGame()

  const [userId, setUserId] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Redeem
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [busy, setBusy] = useState(false)

  useFocusEffect(useCallback(() => { load() }, []))

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const res = await getReferralSummary(user.id)
      if (res?.success) setSummary(res)
    }
    setLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleCopyCode = async () => {
    if (!summary?.my_referral_code) return
    // Native clipboard yerine Share kullanıyoruz (expo-clipboard yüklü değilse Share fallback)
    try {
      await Share.share({
        message: `Join me in Echo Rift! Use my code: ${summary.my_referral_code}`,
      })
    } catch {}
  }

  const handleRedeem = async () => {
    if (!userId || !codeInput.trim()) return
    setBusy(true)

    // IP fetch (cap için)
    const ip = await fetchPublicIP()
    const res = await redeemReferralCode(userId, codeInput.trim(), ip)
    setBusy(false)

    if (res?.success) {
      const messages = res.messages || []
      const messageStr = messages.length > 0
        ? `\n\n⚠️ ${messages.join('\n')}`
        : res.rc_granted_to_referrer
          ? `\n\n+${res.rc_amount} RC sent to ${res.referrer_username}.`
          : ''
      ThemedAlert.alert(
        'Code Redeemed!',
        `You are now connected with ${res.referrer_username}. You'll both earn energy as you level up.${messageStr}`
      )
      setRedeemOpen(false)
      setCodeInput('')
      await load()
    } else {
      const err = res?.error
      const messages: Record<string, string> = {
        EMPTY_CODE: 'Please enter a code.',
        INVALID_CODE: 'Code not found.',
        ALREADY_REDEEMED: 'You already used a referral code.',
        LEVEL_TOO_HIGH: `You can only redeem before reaching level ${res?.max_level || 5}.`,
        CANNOT_USE_OWN_CODE: 'You cannot use your own code.',
      }
      ThemedAlert.alert('Could Not Redeem', messages[err] || err || 'Unknown error')
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.neonGreen as string} />
      </View>
    )
  }

  if (!summary) {
    return (
      <View style={styles.root}>
        <Header onBack={() => navigation.goBack()} />
        <Text style={{ color: COLORS.textSecondary, padding: 24, textAlign: 'center' }}>
          Could not load referral summary.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Header onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
      >
        {/* MY CODE BOX */}
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <Text style={styles.codeValue}>{summary.my_referral_code}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleCopyCode}>
            <Text style={styles.shareBtnText}>📤 SHARE CODE</Text>
          </TouchableOpacity>
        </View>

        {/* REWARD INFO */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🎁 HOW IT WORKS</Text>
          <Text style={styles.infoLine}>
            • Friend uses your code → both become friends instantly
          </Text>
          <Text style={styles.infoLine}>
            • You both earn <Text style={styles.highlight}>3 energy</Text> for every 5 levels they reach (2 after lv.50)
          </Text>
          <Text style={styles.infoLine}>
            • You earn <Text style={styles.highlight}>+{summary.rc_per_referral} RC</Text> instantly when they redeem your code
          </Text>
          <Text style={styles.infoLine}>
            • Max <Text style={styles.highlight}>{summary.rc_ip_cap}</Text> RC bonuses per IP
          </Text>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <Stat label="REFERRALS" value={summary.total_referrals} icon="👥" />
          <Stat label="RC EARNED" value={summary.rc_earned_from_referrals} icon="💎" color={COLORS.neonGreen} />
        </View>
        <View style={styles.statsRow}>
          <Stat
            label="ENERGY (REFERRER)"
            value={summary.total_energy_earned_as_referrer}
            icon="⚡"
            color={COLORS.cyan as string}
          />
          <Stat
            label="ENERGY (REFERRED)"
            value={summary.total_energy_earned_as_referred}
            icon="⚡"
            color={COLORS.cyan as string}
          />
        </View>

        {/* MY REFERRER */}
        {summary.referrer && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR REFERRER</Text>
            <View style={styles.referrerCard}>
              <View style={styles.refAvatar}>
                <Text style={styles.refAvatarText}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.refName}>{summary.referrer.username}</Text>
                <Text style={styles.refSub}>Level {summary.referrer.level}</Text>
              </View>
            </View>
          </View>
        )}

        {/* REDEEM CTA */}
        {summary.can_redeem && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HAVE A CODE?</Text>
            <TouchableOpacity style={styles.redeemBtn} onPress={() => setRedeemOpen(true)}>
              <Text style={styles.redeemBtnText}>🎟️ REDEEM REFERRAL CODE</Text>
            </TouchableOpacity>
            <Text style={styles.redeemHelper}>
              Available until level {summary.level_limit}. Use a friend's code to earn energy together.
            </Text>
          </View>
        )}

        {!summary.can_redeem && summary.already_redeemed && (
          <View style={styles.section}>
            <Text style={styles.helperText}>
              ✓ You already redeemed a referral code.
            </Text>
          </View>
        )}

        {!summary.can_redeem && !summary.already_redeemed && (
          <View style={styles.section}>
            <Text style={styles.helperText}>
              ⓘ Referral code redemption is only available before level {summary.level_limit + 1}.
            </Text>
          </View>
        )}

        {/* REFERRED PLAYERS */}
        {summary.referred_players?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR REFERRALS ({summary.referred_players.length})</Text>
            {summary.referred_players.map((p: any) => (
              <View key={p.player_id} style={styles.referredCard}>
                <View style={styles.refAvatar}>
                  <Text style={styles.refAvatarText}>🎯</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refName}>{p.username}</Text>
                  <Text style={styles.refSub}>
                    Lv.{p.level} • {p.milestones_reached} milestones reached
                  </Text>
                </View>
                <Text style={styles.milestoneCount}>{p.milestones_reached}×</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* REDEEM MODAL */}
      <Modal visible={redeemOpen} transparent animationType="fade" onRequestClose={() => setRedeemOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>REDEEM CODE</Text>
            <Text style={styles.modalLabel}>Friend's Referral Code</Text>
            <TextInput
              style={styles.input}
              placeholder="ECHO-XXXX"
              placeholderTextColor={COLORS.textMuted}
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="characters"
              maxLength={20}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, busy && { opacity: 0.5 }]}
              onPress={handleRedeem}
              disabled={busy || !codeInput.trim()}
            >
              <Text style={styles.primaryBtnText}>{busy ? '...' : 'REDEEM'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setRedeemOpen(false)}>
              <Text style={styles.closeBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backText}>← BACK</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>REFERRAL</Text>
      <View style={{ width: 60 }} />
    </View>
  )
}

function Stat({
  label, value, icon, color = COLORS.textPrimary,
}: { label: string; value: number; icon: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value || 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },

  content: { padding: 16, paddingBottom: 60 },

  codeBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.neonGreen as string,
    borderRadius: 10, padding: 24, alignItems: 'center', marginBottom: 16,
  },
  codeLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 3, marginBottom: 8 },
  codeValue: {
    fontSize: 32, fontWeight: '900', color: COLORS.neonGreen as string,
    letterSpacing: 6, marginBottom: 16,
  },
  shareBtn: {
    backgroundColor: COLORS.neonGreen as string, borderRadius: 6,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  shareBtnText: { fontSize: 12, color: COLORS.bg, fontWeight: '900', letterSpacing: 2 },

  infoBox: {
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 16,
  },
  infoTitle: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  infoLine: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 4 },
  highlight: { color: COLORS.neonGreen as string, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 14, alignItems: 'center',
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1 },

  section: { marginTop: 16 },
  sectionLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },

  referrerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.cyan as string + '50',
    padding: 12, gap: 10,
  },
  refAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bgPanel,
    alignItems: 'center', justifyContent: 'center',
  },
  refAvatarText: { fontSize: 18 },
  refName: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '800' },
  refSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },

  referredCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 10, gap: 10, marginBottom: 6,
  },
  milestoneCount: { fontSize: 14, color: COLORS.neonGreen as string, fontWeight: '900' },

  redeemBtn: {
    backgroundColor: COLORS.cyan as string, borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  redeemBtnText: { fontSize: 12, color: COLORS.bg, fontWeight: '900', letterSpacing: 2 },
  redeemHelper: { fontSize: 10, color: COLORS.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 14 },
  helperText: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, fontStyle: 'italic' },

  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%', maxWidth: 400,
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cyan as string,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '900', color: COLORS.textPrimary,
    letterSpacing: 3, textAlign: 'center', marginBottom: 16,
  },
  modalLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 6,
    padding: 12, fontSize: 14, color: COLORS.textPrimary,
    backgroundColor: COLORS.bgPanel, marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.cyan as string, borderRadius: 6,
    padding: 12, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 12, color: COLORS.bg, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  closeBtnText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
})
