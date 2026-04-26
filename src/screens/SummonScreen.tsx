// =============================================
// ECHO RIFT — SUMMON SCREEN (GACHA)
// Pull animasyonu + banner görünümü
// =============================================

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Dimensions, Animated, Modal, ScrollView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'

const { width, height } = Dimensions.get('window')

const RARITY_COLORS: Record<string, string> = {
  Rare:        '#3B82F6',
  Epic:        '#A855F7',
  Legendary:   '#F59E0B',
  Dimensional: '#FF44DD',
}

const ELEMENT_ICONS: Record<string, string> = {
  fire: '🔥', water: '💧', earth: '🌿', lightning: '⚡', shadow: '🌑',
}

const RARITY_REVEAL_DELAY: Record<string, number> = {
  Rare:        400,
  Epic:        700,
  Legendary:   1200,
  Dimensional: 2000,
}

// ─── PULL RESULT KARTI ────────────────────────────────────────────────────────
function ResultCard({
  result, index, onReveal,
}: {
  result: any; index: number; onReveal: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [showFront, setShowFront] = useState(false)
  const flipAnim  = useRef(new Animated.Value(0)).current
  const glowAnim  = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const rc = RARITY_COLORS[result.rarity] || '#888'

  const reveal = () => {
    if (revealed) return
    setRevealed(true)

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(flipAnim,  { toValue: 1,   duration: RARITY_REVEAL_DELAY[result.rarity] || 500, useNativeDriver: true }),
        Animated.timing(glowAnim,  { toValue: 1,   duration: RARITY_REVEAL_DELAY[result.rarity] || 500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setShowFront(true)
      onReveal()
    })
  }

  const cardRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '0deg'],
  })
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.7, 1], outputRange: [0, 1, 0.6],
  })

  return (
    <TouchableOpacity onPress={reveal} activeOpacity={0.9} style={styles.resultCardWrap}>
      <Animated.View style={[
        styles.resultCard,
        { borderColor: revealed ? rc : 'rgba(255,255,255,0.15)' },
        { transform: [{ rotateY: cardRotate }, { scale: scaleAnim }] },
        revealed && { backgroundColor: rc + '15' },
      ]}>

        {revealed ? (
          <>
            {/* Glow overlay */}
            <Animated.View style={[styles.cardGlow, { backgroundColor: rc, opacity: glowOpacity }]} />

            {result.is_new && (
              <View style={[styles.newBadge, { backgroundColor: rc }]}>
                <Text style={styles.newBadgeTxt}>NEW</Text>
              </View>
            )}

            <Text style={styles.resultEmoji}>{ELEMENT_ICONS[result.element] || '?'}</Text>
            <Text style={[styles.resultName, { color: rc }]} numberOfLines={2}>
              {result.name}
            </Text>
            <Text style={[styles.resultRarity, { color: rc + 'CC' }]}>
              {result.rarity.toUpperCase()}
            </Text>
            {!result.is_new && (
              <Text style={styles.dupeText}>+shard</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.cardBack}>⟡</Text>
            <Text style={styles.cardBackHint}>Tap</Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  )
}

// ─── ANA EKRAN ────────────────────────────────────────────────────────────────
export default function SummonScreen({ navigation }: any) {
  const { playerState } = useGameStore()
  const [userId, setUserId]       = useState<string | null>(null)
  const [banners, setBanners]     = useState<any[]>([])
  const [scrolls, setScrolls]     = useState(0)
  const [loading, setLoading]     = useState(false)
  const [pullResults, setPullResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [revealAll, setRevealAll] = useState(false)
  const [pityInfo, setPityInfo]   = useState<any>(null)
  const [activeBanner, setActiveBanner] = useState<any>(null)
  const [revealedCount, setRevealedCount] = useState(0)

  const rcBalance = playerState?.player?.rc_balance || 0

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const loadBanners = async () => {
    if (!userId) return
    const { data, error } = await supabase.rpc('get_summon_banners', { p_player_id: userId })
    console.log('SUMMON DEBUG:', JSON.stringify({ data, error }))
    if (data?.success) {
      setBanners(data.banners || [])
      setScrolls(data.player_scrolls || 0)
      if (data.banners?.length > 0) setActiveBanner(data.banners[0])
    }
  }

  useFocusEffect(useCallback(() => { 
    if (userId) loadBanners() 
  }, [userId]))
  
  useEffect(() => { 
    if (userId) loadBanners() 
  }, [userId])

  const handlePull = async (count: 1 | 10) => {
    if (!userId || !activeBanner || loading) return
    setLoading(true)
    const { data } = await supabase.rpc('summon_champion', {
      p_player_id: userId,
      p_banner_id: activeBanner.id,
      p_count: count,
    })
    setLoading(false)

    if (data?.success) {
      setPullResults(data.results || [])
      setPityInfo({
        epic_count: data.pity_epic_after,
        leg_count:  data.pity_leg_after,
        epic_max:   data.pity_epic_max,
        leg_max:    data.pity_leg_max,
      })
      setRevealedCount(0)
      setRevealAll(false)
      setShowResults(true)
      await loadBanners()
      // stats refresh on next focus
    } else if (data?.error) {
      // error mesajı göster
    }
  }

  const onCardRevealed = () => {
    setRevealedCount(p => p + 1)
  }

  const handleRevealAll = () => {
    setRevealAll(true)
  }

  const allRevealed = revealedCount >= pullResults.length

  const currentPity = activeBanner?.player_pity
  const epicPct  = currentPity ? Math.round((currentPity.epic_count / (activeBanner?.pity?.epic || 30)) * 100) : 0
  const legPct   = currentPity ? Math.round((currentPity.leg_count  / (activeBanner?.pity?.legendary || 80)) * 100) : 0

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SUMMON</Text>
        <View style={styles.currencyWrap}>
          <Text style={styles.currency}>💎 {rcBalance}</Text>
          <Text style={styles.currency}>📜 {scrolls}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Banner seçimi */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bannerList}>
          {banners.map(b => (
            <TouchableOpacity
              key={b.id}
              style={[styles.bannerTab, activeBanner?.id === b.id && styles.bannerTabActive]}
              onPress={() => setActiveBanner(b)}
            >
              <Text style={[styles.bannerTabTxt, activeBanner?.id === b.id && { color: '#fff' }]}>
                {b.banner_type === 'rate_up' ? '⭐ ' : ''}{b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Banner yok — sessizce bekle */}
        {banners.length === 0 && userId && (
          <View style={styles.emptyState}>
            <TouchableOpacity style={styles.retryBtn} onPress={loadBanners}>
              <Text style={styles.retryBtnTxt}>↻ REFRESH</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeBanner && (
          <>
            {/* Banner başlık */}
            <View style={styles.bannerHero}>
              <Text style={styles.bannerTitle}>{activeBanner.name}</Text>
              {activeBanner.featured_champion && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredTxt}>
                    ⭐ Rate-Up: {activeBanner.featured_champion.name}
                  </Text>
                </View>
              )}
              <Text style={styles.bannerDesc}>{activeBanner.description}</Text>
            </View>

            {/* Pity barları */}
            <View style={styles.pitySection}>
              <Text style={styles.pitySectionTitle}>PITY COUNTERS</Text>
              <View style={styles.pityRow}>
                <Text style={styles.pityLabel}>Epic ({currentPity?.epic_count || 0}/{activeBanner.pity?.epic || 30})</Text>
                <View style={styles.pityBarBg}>
                  <View style={[styles.pityBarFill, { width: `${epicPct}%`, backgroundColor: '#A855F7' }]} />
                </View>
              </View>
              <View style={styles.pityRow}>
                <Text style={styles.pityLabel}>Legendary ({currentPity?.leg_count || 0}/{activeBanner.pity?.legendary || 80})</Text>
                <View style={styles.pityBarBg}>
                  <View style={[styles.pityBarFill, { width: `${legPct}%`, backgroundColor: '#F59E0B' }]} />
                </View>
              </View>
            </View>

            {/* Oranlar */}
            <View style={styles.ratesSection}>
              <Text style={styles.ratesSectionTitle}>ÇIKILMA ORANLARI</Text>
              <View style={styles.ratesRow}>
                {[
                  { label: 'Rare',        val: activeBanner.rates?.rare,        color: '#3B82F6' },
                  { label: 'Epic',        val: activeBanner.rates?.epic,        color: '#A855F7' },
                  { label: 'Legendary',   val: activeBanner.rates?.legendary,   color: '#F59E0B' },
                  { label: 'Dimensional', val: activeBanner.rates?.dimensional, color: '#FF44DD' },
                ].map(r => (
                  <View key={r.label} style={styles.rateItem}>
                    <Text style={[styles.rateVal, { color: r.color }]}>{r.val?.toFixed(1)}%</Text>
                    <Text style={styles.rateLbl}>{r.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Pull butonları */}
            <View style={styles.pullButtons}>
              <TouchableOpacity
                style={[styles.pullBtn, styles.pullBtn1x]}
                onPress={() => handlePull(1)}
                disabled={loading}
              >
                <Text style={styles.pullBtnTitle}>1× SUMMON</Text>
                <Text style={styles.pullBtnCost}>📜 1 scroll  or  💎 {activeBanner.cost_rc}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pullBtn, styles.pullBtn10x]}
                onPress={() => handlePull(10)}
                disabled={loading}
              >
                <Text style={styles.pullBtnTitle}>10× SUMMON</Text>
                <Text style={styles.pullBtnCost}>📜 10 scroll  or  💎 {activeBanner.cost_rc_10x}</Text>
                <View style={styles.valueBadge}>
                  <Text style={styles.valueBadgeTxt}>10% OFF</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.guarantee}>
              {activeBanner.pity?.epic || 30}× pull'da Epic garantili  ·  {activeBanner.pity?.legendary || 80}× pull'da Legendary garantili
            </Text>
          </>
        )}
      </ScrollView>

      {/* Pull sonuç modal */}
      <Modal
        visible={showResults}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.resultsOverlay}>
          <View style={styles.resultsBox}>

            <Text style={styles.resultsTitle}>
              {pullResults.length === 1 ? '1× SUMMON RESULT' : '10× SUMMON RESULTS'}
            </Text>

            {/* Tap hint */}
            {revealedCount < pullResults.length && (
              <TouchableOpacity style={styles.revealAllBanner} onPress={handleRevealAll}>
                <Text style={styles.revealAllBannerTxt}>✨ TAP CARDS OR REVEAL ALL</Text>
              </TouchableOpacity>
            )}

            {/* Kartlar */}
            <View style={styles.resultsGrid}>
              {pullResults.map((r, i) => (
                <ResultCard
                  key={i}
                  result={r}
                  index={i}
                  onReveal={onCardRevealed}
                />
              ))}
            </View>

            {/* Yeni championlar listesi */}
            {allRevealed && (
              <View style={styles.summarySection}>
                {pullResults.some(r => r.rarity === 'Legendary' || r.rarity === 'Dimensional') && (
                  <Text style={styles.specialPull}>
                    ✨ {pullResults.filter(r => r.rarity === 'Legendary' || r.rarity === 'Dimensional').map(r => r.name).join(', ')}
                  </Text>
                )}
                {pityInfo && (
                  <Text style={styles.pityAfter}>
                    Legendary pity: {pityInfo.leg_count}/{pityInfo.leg_max}
                  </Text>
                )}
              </View>
            )}

            {/* Butonlar */}
            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={styles.closeResultBtn}
                onPress={() => { if (allRevealed) { setShowResults(false) } else { handleRevealAll() } }}
              >
                <Text style={styles.closeResultTxt}>
                  {allRevealed ? 'OK' : '✨ REVEAL ALL'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const CARD_W = (width - 60) / 5

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#050A0F' },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  back:     { fontSize: 22, color: '#00D4FF' },
  title:    { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  currencyWrap: { alignItems: 'flex-end', gap: 2 },
  currency: { fontSize: 12, fontWeight: '800', color: '#FFD700' },

  bannerList:     { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  bannerTab:      { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  bannerTabActive:{ borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.15)' },
  bannerTabTxt:   { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },

  bannerHero:     { marginHorizontal: 16, marginVertical: 12, padding: 16, backgroundColor: 'rgba(168,85,247,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  bannerTitle:    { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 6 },
  featuredBadge:  { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  featuredTxt:    { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  bannerDesc:     { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 16 },

  pitySection:      { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12 },
  pitySectionTitle: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 10 },
  pityRow:          { marginBottom: 8 },
  pityLabel:        { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  pityBarBg:        { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  pityBarFill:      { height: '100%', borderRadius: 3 },

  ratesSection:      { marginHorizontal: 16, marginBottom: 12 },
  ratesSectionTitle: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 8 },
  ratesRow:          { flexDirection: 'row', justifyContent: 'space-around' },
  rateItem:          { alignItems: 'center' },
  rateVal:           { fontSize: 16, fontWeight: '900' },
  rateLbl:           { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  pullButtons:  { marginHorizontal: 16, gap: 10, marginBottom: 8 },
  pullBtn:      { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  pullBtn1x:    { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' },
  pullBtn10x:   { borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.1)' },
  pullBtnTitle: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  pullBtnCost:  { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  valueBadge:   { position: 'absolute', top: -8, right: 12, backgroundColor: '#00FF88', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  valueBadgeTxt:{ fontSize: 8, fontWeight: '900', color: '#000' },

  guarantee:    { textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', paddingHorizontal: 20, paddingBottom: 40, lineHeight: 16 },

  emptyState:   { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  emptyDesc:    { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  retryBtn:     { borderWidth: 1, borderColor: '#00D4FF', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnTxt:  { fontSize: 12, fontWeight: '800', color: '#00D4FF', letterSpacing: 1 },

  resultsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  resultsBox:     { backgroundColor: '#060F1E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', width: '100%', maxWidth: 420, padding: 16 },
  resultsTitle:   { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2, textAlign: 'center', marginBottom: 8 },
  revealAllBanner:{ backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  revealAllBannerTxt: { fontSize: 12, fontWeight: '800', color: '#A855F7', letterSpacing: 1 },

  resultsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 },
  resultCardWrap: { width: CARD_W },
  resultCard:     { width: CARD_W, height: CARD_W * 1.4, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' },
  cardGlow:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  newBadge:       { position: 'absolute', top: 4, right: 4, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  newBadgeTxt:    { fontSize: 7, fontWeight: '900', color: '#000' },
  resultEmoji:    { fontSize: 20, marginBottom: 4 },
  resultName:     { fontSize: 8, fontWeight: '800', textAlign: 'center', paddingHorizontal: 2 },
  resultRarity:   { fontSize: 7, letterSpacing: 0.5, marginTop: 2 },
  dupeText:       { fontSize: 7, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  cardBack:       { fontSize: 28, color: 'rgba(255,255,255,0.2)' },
  cardBackHint:   { fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 4 },

  summarySection: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10, marginBottom: 10 },
  specialPull:    { fontSize: 12, color: '#F59E0B', fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  pityAfter:      { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  resultsActions: { flexDirection: 'row', gap: 8 },
  revealAllBtn:   { flex: 1, borderWidth: 1, borderColor: '#A855F7', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  revealAllTxt:   { fontSize: 13, fontWeight: '900', color: '#A855F7', letterSpacing: 1 },
  closeResultBtn: { flex: 1, borderWidth: 1, borderColor: '#00FF88', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(0,255,136,0.1)' },
  closeResultTxt: { fontSize: 13, fontWeight: '900', color: '#00FF88', letterSpacing: 1 },
})