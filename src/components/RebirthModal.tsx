// =============================================
// ECHO RIFT — REBIRTH MODAL
// Pre-confirm → user reviews next-tier bonuses
// Confirm → server rebirth → celebration screen
// =============================================

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ScrollView,
} from 'react-native'
import { COLORS, PRESTIGE } from '../constants'
import { EchoRebirthResult } from '../types'

interface Props {
  visible: boolean
  currentTier: number
  currentLevel: number
  onClose: () => void
  onConfirm: () => Promise<EchoRebirthResult | null>
}

export function RebirthModal({
  visible, currentTier, currentLevel, onClose, onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<EchoRebirthResult | null>(null)
  const glowAnim = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    if (!visible) {
      setResult(null)
      setBusy(false)
      return
    }
    // Subtle neon pulse on the tier badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [visible])

  const nextTier = currentTier + 1
  const requiredLevel = PRESTIGE.threshold(currentTier)
  const eligible = currentLevel >= requiredLevel

  const handleConfirm = async () => {
    if (busy) return
    setBusy(true)
    const res = await onConfirm()
    setBusy(false)
    setResult(res)
  }

  const handleClose = () => {
    if (busy) return
    onClose()
  }

  // ─── PRE-CONFIRM ───────────────────────────────────────────────────────
  const renderPreConfirm = () => {
    const newStat = PRESTIGE.statBonusPct(nextTier)
    const newXp = PRESTIGE.xpMult(nextTier)
    const newRegen = PRESTIGE.regenMinutes(nextTier)
    const newFriends = PRESTIGE.maxFriends(nextTier)
    const rewardRc = nextTier * 30
    const rewardScrap = nextTier * 100

    return (
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>ECHO REBIRTH</Text>
        <Text style={styles.subtitle}>Reset to Lv 1 · Permanent power gains</Text>

        <Animated.View style={[styles.tierBadge, { opacity: glowAnim }]}>
          <Text style={styles.tierLabel}>NEXT TIER</Text>
          <Text style={styles.tierNumber}>T{nextTier}</Text>
        </Animated.View>

        {!eligible && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              ⚠ Reach Lv {requiredLevel} to unlock this rebirth.
              {'\n'}You are Lv {currentLevel}.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PERMANENT GAINS</Text>
          <Row icon="💪" label="Stat bonus" value={`+${newStat}% all`} accent={COLORS.neonGreen as string} />
          <Row icon="⚡" label="XP multiplier" value={`×${newXp.toFixed(2)}`} accent={COLORS.gold as string} />
          <Row icon="🔋" label="Stamina regen" value={newRegen} accent={COLORS.cyan as string} />
          <Row icon="👥" label="Max friends" value={`${newFriends}`} accent={COLORS.cyan as string} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INSTANT REWARDS</Text>
          <Row icon="💎" label="Rift Crystals" value={`+${rewardRc}`} accent={COLORS.neonGreen as string} />
          <Row icon="🔩" label="Scrap Metal" value={`+${rewardScrap}`} accent={COLORS.cyan as string} />
          <Row icon="✨" label="Prestige XP" value={`+${currentLevel * 100}`} accent={COLORS.gold as string} />
        </View>

        <View style={[styles.section, styles.warnSection]}>
          <Text style={styles.sectionLabel}>WHAT RESETS</Text>
          <Text style={styles.dimText}>• Level → 1, XP → 0</Text>
          <Text style={styles.dimText}>• Item levels halved (rarity preserved)</Text>
          <Text style={styles.dimText}>• Enhancement reset to +0 (affixes preserved)</Text>
          <Text style={styles.dimText}>• Inventory, gold, RC, champions, achievements untouched</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={handleClose}
            disabled={busy}
          >
            <Text style={styles.btnGhostText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, (!eligible || busy) && { opacity: 0.4 }]}
            onPress={handleConfirm}
            disabled={!eligible || busy}
          >
            <Text style={styles.btnPrimaryText}>{busy ? 'PROCESSING...' : 'REBIRTH'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  // ─── POST-CONFIRM (SUCCESS) ────────────────────────────────────────────
  const renderSuccess = (r: EchoRebirthResult) => (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>🌌 REBIRTH COMPLETE</Text>
      <Text style={styles.subtitle}>You ascend to Tier {r.new_tier}</Text>

      <View style={styles.bigTierBox}>
        <Text style={styles.bigTierLabel}>NOW AT</Text>
        <Text style={styles.bigTierNumber}>T{r.new_tier}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PERMANENT BONUSES</Text>
        <Row icon="💪" label="Stat bonus" value={`+${r.new_stat_bonus_pct ?? 0}%`} accent={COLORS.neonGreen as string} />
        <Row icon="⚡" label="XP mult" value={`×${(r.new_xp_mult ?? 1).toFixed(2)}`} accent={COLORS.gold as string} />
        <Row icon="🔋" label="Regen" value={`${(r.new_regen_seconds ?? 1800) / 60} min`} accent={COLORS.cyan as string} />
        <Row icon="👥" label="Max friends" value={`${r.new_max_friends ?? 15}`} accent={COLORS.cyan as string} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>YOU EARNED</Text>
        <Row icon="💎" label="Rift Crystals" value={`+${r.rewards?.rc ?? 0}`} accent={COLORS.neonGreen as string} />
        <Row icon="🔩" label="Scrap" value={`+${r.rewards?.scrap ?? 0}`} accent={COLORS.cyan as string} />
        <Row icon="✨" label="Prestige XP" value={`+${r.prestige_xp_gained ?? 0}`} accent={COLORS.gold as string} />
        <Row icon="🎒" label="Items halved" value={`${r.items_halved ?? 0}`} accent={COLORS.textPrimary as string} />
      </View>

      <Text style={styles.successFooter}>
        Lifetime Prestige XP: {(r.prestige_xp_total ?? 0).toLocaleString()}
      </Text>

      <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 16 }]} onPress={onClose}>
        <Text style={styles.btnPrimaryText}>CONTINUE</Text>
      </TouchableOpacity>
    </ScrollView>
  )

  // ─── POST-CONFIRM (ERROR) ──────────────────────────────────────────────
  const renderError = (r: EchoRebirthResult) => (
    <View style={styles.body}>
      <Text style={[styles.title, { color: COLORS.error }]}>REBIRTH FAILED</Text>
      <Text style={styles.subtitle}>
        {r.error === 'LEVEL_TOO_LOW'
          ? `Need Lv ${r.required_level}. You are Lv ${r.current_level}.`
          : r.error || 'Unknown error'}
      </Text>
      <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 24 }]} onPress={onClose}>
        <Text style={styles.btnPrimaryText}>CLOSE</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {result === null
            ? renderPreConfirm()
            : result.success
              ? renderSuccess(result)
              : renderError(result)}
        </View>
      </View>
    </Modal>
  )
}

function Row({ icon, label, value, accent }: {
  icon: string; label: string; value: string; accent: string
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: accent }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%', maxWidth: 420, maxHeight: '90%',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.neonGreen as string,
    borderRadius: 12,
  },
  body: { padding: 20 },
  title: {
    fontSize: 20, fontWeight: '900', color: COLORS.textPrimary,
    letterSpacing: 3, textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5,
    textAlign: 'center', marginBottom: 20,
  },

  tierBadge: {
    alignSelf: 'center',
    borderWidth: 2, borderColor: COLORS.neonGreen as string,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    marginBottom: 20, alignItems: 'center',
    backgroundColor: 'rgba(0,255,136,0.05)',
  },
  tierLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2 },
  tierNumber: {
    fontSize: 36, fontWeight: '900', color: COLORS.neonGreen as string,
    letterSpacing: 2, marginTop: 2,
  },

  bigTierBox: {
    alignSelf: 'center',
    borderWidth: 2, borderColor: COLORS.gold as string,
    borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16,
    marginBottom: 20, alignItems: 'center',
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  bigTierLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2 },
  bigTierNumber: {
    fontSize: 48, fontWeight: '900', color: COLORS.gold as string,
    letterSpacing: 2, marginTop: 2,
  },

  warnBox: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1, borderColor: COLORS.error,
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  warnText: {
    fontSize: 11, color: COLORS.error, lineHeight: 16,
    textAlign: 'center', fontWeight: '700',
  },

  section: { marginBottom: 16 },
  warnSection: {
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)',
  },
  sectionLabel: {
    fontSize: 9, color: COLORS.textMuted, letterSpacing: 2,
    marginBottom: 8, fontWeight: '800',
  },
  dimText: { fontSize: 10, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6,
  },
  rowIcon: { fontSize: 16, width: 28 },
  rowLabel: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: {
    flex: 1, paddingVertical: 14, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  btnGhost: { borderWidth: 1, borderColor: COLORS.textMuted },
  btnGhostText: {
    fontSize: 11, color: COLORS.textMuted, fontWeight: '800', letterSpacing: 2,
  },
  btnPrimary: { backgroundColor: COLORS.neonGreen as string },
  btnPrimaryText: {
    fontSize: 12, color: COLORS.bg, fontWeight: '900', letterSpacing: 2,
  },

  successFooter: {
    fontSize: 11, color: COLORS.gold as string,
    textAlign: 'center', fontWeight: '700', letterSpacing: 1,
    marginTop: 8,
  },
})
