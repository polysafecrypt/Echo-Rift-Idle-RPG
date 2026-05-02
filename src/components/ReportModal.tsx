// =============================================
// ECHO RIFT — REPORT MODAL
// 5 reason + opsiyonel context text
// Anti-abuse: günde 1 aynı kişi raporlanabilir (backend handle eder)
// =============================================

import React, { useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Pressable, ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'
import { ThemedAlert } from './ThemedAlert'

type ReportReason = 'cheat' | 'harassment' | 'spam' | 'inappropriate_name' | 'bot' | 'other'

const REASONS: { key: ReportReason; icon: string; title: string; desc: string }[] = [
  { key: 'cheat',                icon: '⚠️', title: 'Cheating',           desc: 'Suspicious power, hack tools' },
  { key: 'harassment',           icon: '😡', title: 'Harassment',         desc: 'Toxic behavior, abuse' },
  { key: 'spam',                 icon: '📢', title: 'Spam',               desc: 'Repeated messages, ads' },
  { key: 'inappropriate_name',   icon: '🚫', title: 'Inappropriate Name', desc: 'Offensive username' },
  { key: 'bot',                  icon: '🤖', title: 'Bot',                desc: 'Automated farming' },
  { key: 'other',                icon: '❓', title: 'Other',              desc: 'Other violation' },
]

type Props = {
  visible: boolean
  onClose: () => void
  targetPlayerId: string
  targetUsername: string
  reporterId: string
}

export function ReportModal({ visible, onClose, targetPlayerId, targetUsername, reporterId }: Props) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [context, setContext] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason) {
      ThemedAlert.alert('Select Reason', 'Please choose a reason for the report.')
      return
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('report_player', {
        p_reporter_id: reporterId,
        p_target_id: targetPlayerId,
        p_reason: selectedReason,
        p_context: context.trim() || null,
      })

      if (error) {
        ThemedAlert.alert('Error', error.message)
        return
      }

      if (!data?.success) {
        const msgs: Record<string, string> = {
          ALREADY_REPORTED_TODAY: 'You already reported this player today. Try again tomorrow.',
          CANNOT_REPORT_SELF:     'You cannot report yourself.',
          INVALID_REASON:         'Invalid reason.',
        }
        ThemedAlert.alert('Cannot Submit', msgs[data?.error] || data?.error || 'Failed')
        return
      }

      ThemedAlert.alert(
        'Report Submitted',
        `Thank you. Our team will review the report.${data.auto_flagged ? '\n\n⚠️ This player has been auto-flagged for review.' : ''}`,
      )
      handleClose()
    } finally {
      setBusy(false)
    }
  }

  const handleClose = () => {
    setSelectedReason(null)
    setContext('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.box} onPress={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>🚩 REPORT PLAYER</Text>
              <Text style={styles.subtitle}>{targetUsername}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* REASON LIST */}
            <Text style={styles.sectionLabel}>SELECT REASON</Text>
            <View style={styles.reasonList}>
              {REASONS.map((r) => {
                const isSelected = selectedReason === r.key
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                    onPress={() => setSelectedReason(r.key)}
                    disabled={busy}
                  >
                    <Text style={styles.reasonIcon}>{r.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reasonTitle, isSelected && { color: COLORS.error }]}>
                        {r.title}
                      </Text>
                      <Text style={styles.reasonDesc}>{r.desc}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* OPTIONAL CONTEXT */}
            <Text style={styles.sectionLabel}>ADDITIONAL INFO (OPTIONAL)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe what happened..."
              placeholderTextColor={COLORS.textMuted}
              value={context}
              onChangeText={setContext}
              multiline
              maxLength={300}
              editable={!busy}
            />
            <Text style={styles.charCount}>{context.length}/300</Text>
          </ScrollView>

          {/* FOOTER BUTONLAR */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={busy}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!selectedReason || busy) && { opacity: 0.4 }]}
              onPress={handleSubmit}
              disabled={!selectedReason || busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>🚩 SUBMIT REPORT</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  box: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1.5,
    borderColor: 'rgba(255,68,68,0.4)',
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.error,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 1,
  },
  closeIcon: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIconText: { fontSize: 18, color: COLORS.textSecondary },

  sectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  reasonList: {
    paddingHorizontal: 16,
    gap: 6,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  reasonRowSelected: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255,68,68,0.08)',
  },
  reasonIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  reasonDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.error },
  radioInner: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.error,
  },

  textArea: {
    marginHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    color: COLORS.textPrimary,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'right',
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1.5,
  },
})
