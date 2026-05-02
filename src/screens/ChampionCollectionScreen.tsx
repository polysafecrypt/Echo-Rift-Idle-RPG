// =============================================
// ECHO RIFT — CHAMPION COLLECTION SCREEN
// Tüm championların galeri görünümü
// =============================================

import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Dimensions, Image, Modal, ScrollView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import ChampionSkillPreviewModal from '../components/ChampionSkillPreviewModal'

const { width } = Dimensions.get('window')
const CARD_SIZE = (width - 48) / 4  // 4 sütun

// ─── SABİTLER ────────────────────────────────────────────────────────────────
const RARITY_COLORS: Record<string, string> = {
  Rare:        '#3B82F6',
  Epic:        '#A855F7',
  Legendary:   '#F59E0B',
  Dimensional: '#FF44DD',
}

const ELEMENT_COLORS: Record<string, string> = {
  fire:      '#FF4400',
  water:     '#0088CC',
  earth:     '#886633',
  lightning: '#DDCC00',
  shadow:    '#8800CC',
}

const ELEMENT_ICONS: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿', lightning: '⚡', shadow: '🌑',
}

const CLASS_ICONS: Record<string, string> = {
  warrior: '⚔️', mage: '🔮', assassin: '🗡️', priest: '✨', archer: '🏹',
}

const RARITY_ORDER: Record<string, number> = {
  Dimensional: 0, Legendary: 1, Epic: 2, Rare: 3,
}

// Skill effect → temiz Türkçe/İngilizce etiket (ChampionDetailModal özet listesi için)
const EFFECT_LABELS: Record<string, string> = {
  // Damage
  reflect_percent: 'Damage Reflect',
  reflect_dmg: 'Damage Reflect',
  phys_dmg_reduction: 'Physical Damage Reduction',
  dmg_reduction: 'Damage Reduction',
  // Heal / Regen
  hp_regen: 'HP Regen / Round',
  hp_regen_slow: 'HP Regen / Round',
  hp_regen_fire: 'HP Regen / Round',
  hp_regen_team: 'Team HP Regen / Round',
  heal_per_turn: 'HP Regen / Round',
  heal_over_time: 'HP Regen Over Time',
  heal_lowest_hp: 'Heals Lowest HP Ally',
  heal_on_skill: 'Heal On Skill Use',
  heal_from_dmg: 'Lifesteal (Passive)',
  lifesteal_passive: 'Lifesteal (Passive)',
  hp_steal: 'HP Steal',
  hp_steal_skill: 'HP Steal On Skill',
  steal_hp_heal: 'Lifesteal On Hit',
  lifesteal_dmg: 'Lifesteal On Hit',
  def_regen: 'DEF Regen / Round',
  // ATK buffs
  atk_bonus: 'ATK Bonus',
  atk_bonus_fire: 'ATK Bonus (Fire Synergy)',
  atk_bonus_night: 'ATK Bonus (Night Phase)',
  atk_buff_team: 'ATK Buff (Team)',
  atk_first_turn: 'ATK Bonus (Round 1)',
  atk_on_hit: 'ATK Bonus On Hit',
  first_strike: 'Always Attacks First',
  // DEF / Resist
  def_bonus: 'DEF Bonus',
  def_on_low_hp: 'DEF Bonus At Low HP',
  def_scale_hp: 'DEF Scales With HP',
  def_buff_team: 'DEF Buff (Team)',
  // Crit
  crit_chance_bonus: 'Crit Chance Bonus',
  crit_dmg_bonus: 'Crit Damage Bonus',
  crit_on_kill: 'Guaranteed Crit On Kill',
  // Dodge / Speed
  dodge_bonus: 'Dodge Bonus',
  dodge_on_low_hp: 'Dodge Bonus At Low HP',
  atk_speed_bonus: 'Attack Speed Bonus',
  atk_speed_team: 'Attack Speed (Team)',
  // Enemy debuffs
  reduce_enemy_atk: 'Reduces Enemy ATK',
  def_reduction_aura: 'Reduces Enemy DEF',
  atk_debuff_on_hit: 'ATK Debuff On Hit',
  slow_attackers: 'Slows Attackers',
  fear_on_hit: 'Fear On Hit',
  // Immune
  immune_pierce: 'Immune To Pierce',
  immune_knockback: 'Immune To Knockback',
  immune_to_debuff: 'Immune To Debuffs',
  // DoT
  dot_dmg: 'DoT Damage',
  dot_on_crit: 'DoT On Critical Hit',
  aoe_small_on_atk: 'AoE Splash On Attack',
  reflect_lightning: 'Reflects Lightning Damage',
  // Attract / Taunt
  attract_hits: 'Taunts Enemies',
  // Execute
  execute_threshold: 'Execute Below HP Threshold',
  // Skill stack
  skill_dmg_stack: 'Skill Damage Stacks',
  // Status
  stun_on_crit: 'Stun On Critical Hit',
  dmg_after_dodge: 'Bonus Damage After Dodge',
}

// ─── CHAMPION KARTI ──────────────────────────────────────────────────────────
function ChampionCard({ champ, onPress }: { champ: any; onPress: () => void }) {
  const rc = RARITY_COLORS[champ.rarity] || '#888'
  const ec = ELEMENT_COLORS[champ.element] || '#888'
  const locked = !champ.owned

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: locked ? 'rgba(255,255,255,0.08)' : rc + '90' },
        locked && styles.cardLocked,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Arka plan tint */}
      {!!(champ.owned) && (
        <View style={[styles.cardBg, { backgroundColor: rc + '18' }]} />
      )}

      {/* Portrait placeholder */}
      <View style={[styles.portraitWrap, { borderColor: locked ? 'rgba(255,255,255,0.1)' : ec }]}>
        <Text style={styles.portraitEmoji}>{ELEMENT_ICONS[champ.element] || '?'}</Text>
        {!locked && champ.slot_index !== null && champ.slot_index !== undefined && (
          <View style={styles.slotBadge}>
            <Text style={styles.slotBadgeTxt}>{champ.slot_index + 1}</Text>
          </View>
        )}
      </View>

      {/* İsim */}
      <Text style={[styles.cardName, locked && styles.cardNameLocked]} numberOfLines={1}>
        {locked ? '???' : champ.name.split(' ')[0]}
      </Text>

      {/* Stars */}
      {!!(champ.owned) && (
        <Text style={styles.stars}>{'★'.repeat(champ.stars)}</Text>
      )}

      {/* Kilit ikonu */}
      {!!(locked) && <Text style={styles.lockIcon}>🔒</Text>}
    </TouchableOpacity>
  )
}

// ─── CHAMPION DETAY MODAL ─────────────────────────────────────────────────────
function ChampionDetailModal({
  champ, visible, onClose, onEquip, onUnequip, activeSlots,
  onLevelUp, onAscend, materials, playerId,
}: {
  champ: any; visible: boolean; onClose: () => void;
  onEquip: (pcId: string, slot: number) => void;
  onUnequip: (pcId: string) => void;
  activeSlots: (any | null)[];
  onLevelUp: (pcId: string, stoneType: string) => void;
  onAscend: (pcId: string) => void;
  materials: any;
  playerId: string | null;
}) {
  const [showPreview, setShowPreview] = useState(false)

  // Modal kapanınca preview state'ini temizle (race condition önle)
  useEffect(() => {
    if (!visible) setShowPreview(false)
  }, [visible])

  if (!champ) return null
  const rc = RARITY_COLORS[champ.rarity] || '#888'
  const ec = ELEMENT_COLORS[champ.element] || '#888'

  const onShowSkillPreview = () => setShowPreview(true)

  const lvlAtk  = Math.floor(champ.base_atk * (1 + (champ.level - 1) * 0.02) * (1 + (champ.stars - 1) * 0.2) * 0.35)
  const lvlHp   = Math.floor(champ.base_hp  * (1 + (champ.level - 1) * 0.02) * (1 + (champ.stars - 1) * 0.2) * 0.35)
  const lvlDef  = Math.floor(champ.base_def * (1 + (champ.level - 1) * 0.02) * (1 + (champ.stars - 1) * 0.2) * 0.35)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.detailBox, { borderColor: rc + '80' }]}>

          {/* Header */}
          <View style={[styles.detailHeader, { backgroundColor: rc + '20' }]}>
            <View style={styles.detailHeaderLeft}>
              <Text style={styles.detailEmoji}>{ELEMENT_ICONS[champ.element]}</Text>
              <View>
                <Text style={[styles.detailName, { color: rc }]}>{champ.name}</Text>
                <Text style={styles.detailSub}>
                  {champ.rarity.toUpperCase()} · {CLASS_ICONS[champ.class_type]} {champ.class_type.toUpperCase()}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>

            {champ.owned ? (
              <>
                {/* Stars + Level */}
                <View style={styles.champMeta}>
                  <Text style={[styles.starsLarge, { color: rc }]}>
                    {'★'.repeat(champ.stars)}{'☆'.repeat(6 - champ.stars)}
                  </Text>
                  <Text style={styles.champLevel}>LV {champ.level}</Text>
                </View>

                {/* XP Bar */}
                <View style={styles.xpBarWrap}>
                  <View style={styles.xpBarBg}>
                    <View style={[styles.xpBarFill, {
                      width: `${Math.min(100, (champ.xp / champ.xp_to_next) * 100)}%`,
                      backgroundColor: rc,
                    }]} />
                  </View>
                  <Text style={styles.xpText}>{champ.xp} / {champ.xp_to_next} XP</Text>
                </View>

                {/* Stats */}
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLbl}>ATK BONUS</Text>
                    <Text style={[styles.statVal, { color: '#EF4444' }]}>+{lvlAtk}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLbl}>HP BONUS</Text>
                    <Text style={[styles.statVal, { color: '#00FF88' }]}>+{lvlHp}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLbl}>DEF BONUS</Text>
                    <Text style={[styles.statVal, { color: '#3B82F6' }]}>+{lvlDef}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLbl}>CRIT BONUS</Text>
                    <Text style={[styles.statVal, { color: '#A855F7' }]}>+{(champ.base_crit * 0.5).toFixed(1)}%</Text>
                  </View>
                </View>

                {/* Skills */}
                <View style={styles.skillSection}>
                  <View style={styles.skillSectionHeader}>
                    <Text style={styles.skillSectionTitle}>SKILLS</Text>
                    <TouchableOpacity
                      style={[styles.skillInfoBtn, { borderColor: rc }]}
                      onPress={onShowSkillPreview}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.skillInfoBtnTxt, { color: rc }]}>? DETAILS</Text>
                    </TouchableOpacity>
                  </View>
                  {[
                    { label: 'Passive 1', data: champ.skill_passive_1, lv: champ.skill_1_level },
                    { label: 'Passive 2', data: champ.skill_passive_2, lv: champ.skill_2_level },
                    { label: 'Active',  data: champ.skill_active,    lv: champ.skill_3_level },
                  ].map((s, i) => s.data?.name && (
                    <TouchableOpacity
                      key={i}
                      style={styles.skillRow}
                      onPress={onShowSkillPreview}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.skillTypeBadge, { backgroundColor: i === 2 ? rc + '30' : 'rgba(255,255,255,0.06)' }]}>
                        <Text style={[styles.skillTypeText, i === 2 && { color: rc }]}>{s.label}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.skillName}>{s.data.name}</Text>
                        {!!(s.data.effect) && (
                          <Text style={styles.skillEffect}>{EFFECT_LABELS[s.data.effect] || s.data.effect.replace(/_/g, ' ')} · Lv{s.lv}</Text>
                        )}
                      </View>
                      <View style={[styles.skillRowQ, { borderColor: rc + '60' }]}>
                        <Text style={[styles.skillRowQTxt, { color: rc }]}>?</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Lore */}
                {!!(champ.lore) && (
                  <Text style={styles.loreText}>"{champ.lore}"</Text>
                )}

                {/* LEVEL UP */}
                <View style={styles.upgradeSection}>
                  <Text style={styles.upgradeSectionTitle}>LEVEL UP</Text>
                  <View style={styles.upgradeRow}>
                    {[
                      { key: 'small',  label: '+200 XP',  color: '#3B82F6', count: materials?.champion_xp_stone_small  || 0 },
                      { key: 'medium', label: '+1000 XP', color: '#A855F7', count: materials?.champion_xp_stone_medium || 0 },
                      { key: 'large',  label: '+5000 XP', color: '#F59E0B', count: materials?.champion_xp_stone_large  || 0 },
                    ].map(s => (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.stoneBtn, { borderColor: s.count > 0 ? s.color : 'rgba(255,255,255,0.1)' }]}
                        onPress={() => s.count > 0 && champ.level < 60 && onLevelUp(champ.pc_id, s.key)}
                        disabled={s.count === 0 || champ.level >= 60}
                      >
                        <Text style={[styles.stoneBtnXp, { color: s.count > 0 ? s.color : 'rgba(255,255,255,0.3)' }]}>{s.label}</Text>
                        <Text style={[styles.stoneBtnCount, { color: s.count > 0 ? '#fff' : 'rgba(255,255,255,0.3)' }]}>×{s.count}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {champ.level >= 60 && <Text style={styles.maxText}>MAX LEVEL</Text>}
                </View>

                {/* STAR ASCEND */}
                {champ.stars < 6 && (
                  <View style={styles.upgradeSection}>
                    <Text style={styles.upgradeSectionTitle}>STAR UPGRADE</Text>
                    <View style={styles.ascendRow}>
                      <View>
                        <Text style={[styles.starsLarge, { color: rc, fontSize: 20 }]}>
                          {'★'.repeat(champ.stars)}{'☆'.repeat(6 - champ.stars)}
                        </Text>
                        <Text style={styles.shardCount}>
                          Shard: {materials?.ascend_shard || 0} / {champ.stars * ({'Rare':3,'Epic':6,'Legendary':12,'Dimensional':25}[champ.rarity as string] || 3)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.ascendBtn, { borderColor: rc,
                          opacity: (materials?.ascend_shard || 0) >= champ.stars * ({'Rare':3,'Epic':6,'Legendary':12,'Dimensional':25}[champ.rarity as string] || 3) ? 1 : 0.4
                        }]}
                        onPress={() => onAscend(champ.pc_id)}
                      >
                        <Text style={[styles.ascendBtnTxt, { color: rc }]}>★ UPGRADE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {champ.stars >= 6 && (
                  <View style={styles.upgradeSection}>
                    <Text style={[styles.upgradeSectionTitle, { color: rc }]}>⚡ AWAKENED — MAX STARS</Text>
                  </View>
                )}

                {/* Equip butonları */}
                <View style={styles.equipButtons}>
                  {champ.slot_index !== null && champ.slot_index !== undefined ? (
                    <TouchableOpacity
                      style={styles.unequipBtn}
                      onPress={() => onUnequip(champ.pc_id)}
                    >
                      <Text style={styles.unequipBtnTxt}>REMOVE FROM SLOT {champ.slot_index + 1}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.equipRow}>
                      <Text style={styles.equipLabel}>Place in slot:</Text>
                      {[0, 1].map(slot => (
                        <TouchableOpacity
                          key={slot}
                          style={[styles.equipSlotBtn, { borderColor: rc }]}
                          onPress={() => onEquip(champ.pc_id, slot)}
                        >
                          <Text style={[styles.equipSlotBtnTxt, { color: rc }]}>
                            SLOT {slot + 1}
                            {activeSlots[slot] ? ` (${activeSlots[slot].name.split(' ')[0]})` : ' (empty)'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

              </>
            ) : (
              /* Sahip değil */
              <View style={styles.lockedView}>
                <Text style={styles.lockedIcon}>🔒</Text>
                <Text style={styles.lockedName}>{champ.name}</Text>
                <Text style={styles.lockedDesc}>This champion is not in your collection yet.</Text>
                <Text style={[styles.lockedRarity, { color: rc }]}>{champ.rarity}</Text>
                {/* Locked olsa bile skill detayını göster — oyuncu görmek isteyebilir */}
                <TouchableOpacity
                  style={[styles.skillInfoBtn, { borderColor: rc, marginTop: 12 }]}
                  onPress={onShowSkillPreview}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.skillInfoBtnTxt, { color: rc }]}>? VIEW SKILLS</Text>
                </TouchableOpacity>
                <Text style={styles.loreText}>{champ.lore}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* SKILL PREVIEW — inline overlay, Modal içinde render edilir */}
        <ChampionSkillPreviewModal
          visible={showPreview}
          championId={champ.id}
          playerId={playerId}
          onClose={() => setShowPreview(false)}
        />
      </View>
    </Modal>
  )
}

// ─── ANA EKRAN ────────────────────────────────────────────────────────────────
export default function ChampionCollectionScreen({ navigation }: any) {
  const [userId, setUserId] = useState<string | null>(null)
  const [champions, setChampions] = useState<any[]>([])
  const [materials, setMaterials] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'owned' | 'fire' | 'water' | 'earth' | 'lightning' | 'shadow'>('all')
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const loadChampions = async () => {
    if (!userId) return
    setLoading(true)
    const [champsRes, matsRes] = await Promise.all([
      supabase.rpc('get_champions', { p_player_id: userId }),
      supabase.from('player_materials').select(
        'champion_xp_stone_small,champion_xp_stone_medium,champion_xp_stone_large,ascend_shard'
      ).eq('player_id', userId).single(),
    ])
    if (champsRes.data?.success) setChampions(champsRes.data.champions || [])
    if (matsRes.data) setMaterials(matsRes.data)
    setLoading(false)
  }

  useFocusEffect(useCallback(() => {
    if (userId) loadChampions()
  }, [userId]))

  useEffect(() => {
    if (userId) loadChampions()
  }, [userId])

  const handleEquip = async (pcId: string, slot: number) => {
    if (!userId) return
    const { data } = await supabase.rpc('equip_champion', {
      p_player_id: userId, p_pc_id: pcId, p_slot_index: slot,
    })
    if (data?.success) { await loadChampions(); setSelected(null) }
  }

  const handleUnequip = async (pcId: string) => {
    if (!userId) return
    const { data } = await supabase.rpc('equip_champion', {
      p_player_id: userId, p_pc_id: pcId, p_slot_index: null,
    })
    if (data?.success) { await loadChampions(); setSelected(null) }
  }

  const handleLevelUp = async (pcId: string, stoneType: string) => {
    if (!userId) return
    const { data } = await supabase.rpc('level_up_champion', {
      p_player_id: userId, p_pc_id: pcId, p_stone_type: stoneType,
    })
    if (data?.success) {
      await loadChampions()
      if (data.leveled_up) {
        setSelected((prev: any) => prev ? {
          ...prev, level: data.new_level, xp: data.xp, xp_to_next: data.xp_to_next
        } : null)
      }
    }
  }

  const handleAscend = async (pcId: string) => {
    if (!userId) return
    const { data } = await supabase.rpc('ascend_champion', {
      p_player_id: userId, p_pc_id: pcId,
    })
    if (data?.success) {
      await loadChampions()
      setSelected((prev: any) => prev ? {
        ...prev, stars: data.new_stars, is_awakened: data.is_awakened
      } : null)
    }
  }

  const filtered = champions.filter(c => {
    if (filter === 'owned')   return c.owned
    if (filter !== 'all')     return c.element === filter
    return true
  }).sort((a, b) => {
    if (a.owned !== b.owned) return a.owned ? -1 : 1
    return (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9)
  })

  const activeSlots = [
    champions.find(c => c.owned && c.slot_index === 0) || null,
    champions.find(c => c.owned && c.slot_index === 1) || null,
  ]

  const ownedCount = champions.filter(c => c.owned).length

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>CHAMPIONS</Text>
          <Text style={styles.subtitle}>{ownedCount} / {champions.length} toplandi</Text>
        </View>
        <TouchableOpacity
          style={styles.summonBtn}
          onPress={() => navigation.navigate('Summon')}
        >
          <Text style={styles.summonBtnTxt}>✨ SUMMON</Text>
        </TouchableOpacity>
      </View>

      {/* Aktif slotlar */}
      <View style={styles.activeSlots}>
        <Text style={styles.activeSlotsLabel}>ACTIVE TEAM</Text>
        <View style={styles.activeSlotRow}>
          {[0, 1].map(slot => (
            <View key={slot} style={[styles.activeSlotBox, activeSlots[slot] && {
              borderColor: RARITY_COLORS[activeSlots[slot].rarity] + '80',
              backgroundColor: RARITY_COLORS[activeSlots[slot].rarity] + '12',
            }]}>
              {activeSlots[slot] ? (
                <>
                  <Text style={styles.activeSlotEmoji}>{ELEMENT_ICONS[activeSlots[slot].element]}</Text>
                  <Text style={styles.activeSlotName} numberOfLines={1}>{activeSlots[slot].name.split(' ')[0]}</Text>
                  <Text style={styles.activeSlotLv}>Lv{activeSlots[slot].level}</Text>
                </>
              ) : (
                <Text style={styles.emptySlot}>SLOT {slot + 1}{'\n'}EMPTY</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Filtreler */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}>
        {(['all', 'owned', 'fire', 'water', 'earth', 'lightning', 'shadow'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnTxt, filter === f && styles.filterBtnTxtActive]}>
              {f === 'all' ? 'ALL' : f === 'owned' ? 'OWNED' :
                `${ELEMENT_ICONS[f]} ${f.toUpperCase()}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={filtered}
        numColumns={4}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <ChampionCard champ={item} onPress={() => setSelected(item)} />
        )}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.empty}>Loading...</Text>
          ) : (
            <Text style={styles.empty}>No champions found</Text>
          )
        }
      />

      {/* Detail Modal */}
      <ChampionDetailModal
        champ={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        activeSlots={activeSlots}
        onLevelUp={handleLevelUp}
        onAscend={handleAscend}
        materials={materials}
        playerId={userId}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#050A0F' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  back:             { fontSize: 22, color: '#00D4FF', marginRight: 8 },
  title:            { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  subtitle:         { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  summonBtn:        { borderWidth: 1, borderColor: '#A855F7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  summonBtnTxt:     { fontSize: 11, fontWeight: '800', color: '#A855F7', letterSpacing: 1 },

  activeSlots:      { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10 },
  activeSlotsLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 8 },
  activeSlotRow:    { flexDirection: 'row', gap: 10 },
  activeSlotBox:    { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 8, alignItems: 'center', minHeight: 64 },
  activeSlotEmoji:  { fontSize: 20 },
  activeSlotName:   { fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 },
  activeSlotLv:     { fontSize: 9, color: 'rgba(255,255,255,0.5)' },
  emptySlot:        { fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', letterSpacing: 1 },

  filterScroll:     { maxHeight: 40, marginBottom: 8 },
  filterContent:    { paddingHorizontal: 16, gap: 8 },
  filterBtn:        { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  filterBtnActive:  { borderColor: '#00D4FF', backgroundColor: 'rgba(0,212,255,0.1)' },
  filterBtnTxt:     { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 1 },
  filterBtnTxtActive: { color: '#00D4FF' },

  grid:             { padding: 12, paddingBottom: 100 },
  gridRow:          { gap: 8, marginBottom: 8 },
  empty:            { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40, fontSize: 13 },

  card:             { width: CARD_SIZE, borderWidth: 1, borderRadius: 8, alignItems: 'center', padding: 6, overflow: 'hidden', position: 'relative' },
  cardLocked:       { opacity: 0.45 },
  cardBg:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  portraitWrap:     { width: CARD_SIZE - 16, height: CARD_SIZE - 16, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.04)' },
  portraitEmoji:    { fontSize: 22 },
  slotBadge:        { position: 'absolute', top: 2, right: 2, backgroundColor: '#00FF88', borderRadius: 4, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  slotBadgeTxt:     { fontSize: 8, fontWeight: '900', color: '#000' },
  cardName:         { fontSize: 8, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  cardNameLocked:   { color: 'rgba(255,255,255,0.3)' },
  stars:            { fontSize: 8, color: '#F59E0B', marginTop: 2 },
  lockIcon:         { position: 'absolute', bottom: 4, right: 4, fontSize: 9 },

  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  detailBox:        { backgroundColor: '#060F1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, paddingBottom: 40, overflow: 'hidden' },
  detailHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailEmoji:      { fontSize: 32 },
  detailName:       { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  detailSub:        { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: 1 },
  closeBtn:         { padding: 8 },
  closeTxt:         { fontSize: 18, color: 'rgba(255,255,255,0.4)' },

  champMeta:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  starsLarge:       { fontSize: 18, letterSpacing: 2 },
  champLevel:       { fontSize: 14, fontWeight: '800', color: '#fff' },
  xpBarWrap:        { paddingHorizontal: 20, marginTop: 6 },
  xpBarBg:          { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  xpBarFill:        { height: '100%', borderRadius: 2 },
  xpText:           { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3, textAlign: 'right' },

  statGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  statItem:         { width: (width - 56) / 2, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10 },
  statLbl:          { fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 },
  statVal:          { fontSize: 18, fontWeight: '900', marginTop: 2 },

  skillSection:        { paddingHorizontal: 20, marginTop: 14 },
  skillSectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  skillSectionTitle:   { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  skillInfoBtn:        { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  skillInfoBtnTxt:     { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  skillRow:            { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  skillTypeBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  skillTypeText:       { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  skillName:           { fontSize: 13, fontWeight: '700', color: '#fff' },
  skillEffect:         { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, textTransform: 'capitalize' },
  skillRowQ:           { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  skillRowQTxt:        { fontSize: 12, fontWeight: '900' },

  loreText:         { marginHorizontal: 20, marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', lineHeight: 17 },

  equipButtons:     { paddingHorizontal: 20, marginTop: 16 },
  equipRow:         { gap: 8 },
  equipLabel:       { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 4 },
  equipSlotBtn:     { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  equipSlotBtnTxt:  { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  unequipBtn:       { borderWidth: 1, borderColor: '#F59E0B', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.08)' },
  unequipBtnTxt:    { fontSize: 13, fontWeight: '900', color: '#F59E0B', letterSpacing: 1 },

  lockedView:       { padding: 24, alignItems: 'center' },

  upgradeSection:   { marginHorizontal: 20, marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12 },
  upgradeSectionTitle: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 8 },
  upgradeRow:       { flexDirection: 'row', gap: 8 },
  stoneBtn:         { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', gap: 2 },
  stoneBtnXp:       { fontSize: 10, fontWeight: '800' },
  stoneBtnCount:    { fontSize: 12, fontWeight: '900' },
  maxText:          { fontSize: 11, color: '#00FF88', fontWeight: '800', textAlign: 'center', marginTop: 4 },
  ascendRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shardCount:       { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  ascendBtn:        { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  ascendBtnTxt:     { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  lockedIcon:       { fontSize: 40, marginBottom: 12 },
  lockedName:       { fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 6 },
  lockedDesc:       { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  lockedRarity:     { fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
})