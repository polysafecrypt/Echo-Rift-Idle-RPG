// =============================================
// ECHO RIFT — CHAMPION SKILL PREVIEW MODAL
// "?" ikonu tıklandığında açılan skill detay popup
// Backend RPC: calculate_champion_skill_preview
// =============================================

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import {
  ChampionSkillPreview, ChampionSkillData,
  ELEMENT_COLORS, ELEMENT_ICONS, ElementType,
  RARITY_COLORS, Rarity,
} from '../types'

interface Props {
  visible: boolean
  championId: string | null
  playerId: string | null
  onClose: () => void
}

export default function ChampionSkillPreviewModal({
  visible, championId, playerId, onClose,
}: Props) {
  const [data, setData] = useState<ChampionSkillPreview | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !championId) return
    setLoading(true)
    setData(null)
    supabase.rpc('calculate_champion_skill_preview', {
      p_champion_id: championId,
      p_player_id: playerId ?? null,
    }).then(({ data: res, error }) => {
      if (!error && res?.success) setData(res as ChampionSkillPreview)
      setLoading(false)
    })
  }, [visible, championId, playerId])

  if (!visible) return null

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.box}>
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text style={styles.loadingText}>Loading skill data...</Text>
          </View>
        )}
        {!loading && data && <SkillContent data={data} onClose={onClose} />}
        {!loading && !data && (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Failed to load skills.</Text>
            <TouchableOpacity style={styles.closeBtnBig} onPress={onClose}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

function SkillContent({ data, onClose }: { data: ChampionSkillPreview; onClose: () => void }) {
  const champ = data.champion
  const elem = champ.element as ElementType
  const elemColor = ELEMENT_COLORS[elem] ?? '#888'
  const rarColor  = RARITY_COLORS[champ.rarity as Rarity] ?? '#888'

  return (
    <>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: rarColor + '50' }]}>
        <View style={[styles.portrait, { borderColor: elemColor }]}>
          <Text style={styles.portraitEmoji}>{ELEMENT_ICONS[elem] ?? '?'}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: rarColor }]}>{champ.name}</Text>
          <Text style={styles.headerSub}>
            {champ.rarity.toUpperCase()} · LV {champ.level} · {'★'.repeat(champ.stars)}
          </Text>
          <Text style={[styles.headerCalc, { color: elemColor }]}>
            ATK {data.player_atk_used.toLocaleString()} · HP {data.player_hp_used.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {data.skills.map((sk, i) => (
          <SkillRow key={i} skill={sk} elementColor={elemColor} />
        ))}

        {champ.lore && (
          <Text style={styles.lore}>"{champ.lore}"</Text>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.closeBtnBig, { borderColor: elemColor }]}
        onPress={onClose}
      >
        <Text style={[styles.closeBtnText, { color: elemColor }]}>CLOSE</Text>
      </TouchableOpacity>
    </>
  )
}

function SkillRow({ skill, elementColor }: { skill: ChampionSkillData; elementColor: string }) {
  const isActive = skill.type === 'active'
  const typeColor = isActive ? elementColor : '#A0A0A0'
  const typeLabel = skill.type === 'passive_1' ? 'PASSIVE 1'
                  : skill.type === 'passive_2' ? 'PASSIVE 2'
                  : 'ACTIVE'

  return (
    <View style={[
      styles.skillRow,
      isActive && { borderColor: elementColor + '50', backgroundColor: elementColor + '10' },
    ]}>
      <View style={styles.skillTopRow}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '30', borderColor: typeColor }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
        <Text style={[styles.skillName, isActive && { color: elementColor }]}>{skill.name}</Text>
        {isActive && skill.cooldown && (
          <View style={styles.cdBadge}>
            <Text style={styles.cdBadgeText}>CD {skill.cooldown}</Text>
          </View>
        )}
      </View>

      <Text style={styles.skillDesc}>{skill.description}</Text>

      <View style={[styles.valueBox, { borderLeftColor: elementColor }]}>
        <Text style={[styles.valueText, { color: elementColor }]}>{skill.value_text}</Text>
      </View>

      {isActive && skill.cooldown && (
        <Text style={styles.triggerText}>
          Triggers: Round {skill.cooldown}, {skill.cooldown * 2}, {skill.cooldown * 3}, ...
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  box: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#0A1628',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.3)',
    overflow: 'hidden',
    zIndex: 10000,
    elevation: 10000,
  },
  loading: {
    padding: 50,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  portrait: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: { fontSize: 28 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginTop: 2 },
  headerCalc: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnTxt: { fontSize: 20, color: 'rgba(255,255,255,0.5)' },

  scroll: { paddingHorizontal: 14, paddingTop: 14 },

  skillRow: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 10,
  },
  skillTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  skillName: { flex: 1, fontSize: 14, fontWeight: '900', color: '#fff' },
  cdBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  cdBadgeText: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },

  skillDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },

  valueBox: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    paddingVertical: 4,
  },
  valueText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  triggerText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
    fontStyle: 'italic',
    letterSpacing: 1,
  },

  lore: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 17,
    paddingHorizontal: 4,
  },

  closeBtnBig: {
    margin: 14,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: 3 },
})