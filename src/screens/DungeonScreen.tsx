// =============================================
// ECHO RIFT — DUNGEON SCREEN
// =============================================

import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS } from '../constants'
import { DungeonBattleResult } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'

const { width, height } = Dimensions.get('window')

export default function DungeonScreen({ navigation }: any) {
  const { playerState } = useGameStore()
  const { fetchPlayerState, dungeonBattle, buyDungeonAttempt } = useGame()
  const [userId, setUserId] = useState<string | null>(null)
  const [battling, setBattling] = useState(false)
  const [lastResult, setLastResult] = useState<DungeonBattleResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Animasyonlar
  const battleAnim = useRef(new Animated.Value(0)).current
  const weaponX = useRef(new Animated.Value(-width)).current
  const resultOpacity = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current
  const bossShake = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [])
  )

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const state = await fetchPlayerState(user.id)
      const currentLevel = state?.player?.level || 0
      // prevLevelRef yok, DungeonScreen'de eklenmemiş, sadece örnek için null yazıyoruz
    }
  }

  const playBattleAnimation = (result: 'victory' | 'defeat') => {
    // Silah animasyonu
    Animated.sequence([
      Animated.timing(weaponX, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(weaponX, {
        toValue: width * 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Boss shake (hasar aldığında)
    Animated.sequence([
      Animated.delay(400),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bossShake, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(bossShake, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ),
    ]).start()

    // Sonuç göster
    setTimeout(() => {
      weaponX.setValue(-width)
      bossShake.setValue(0)

      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start()

      setShowResult(true)
    }, 1200)
  }

  const handleBuyAttempt = async (type: 'ad' | 'rc') => {
    if (!userId) return

    // Reklam senaryosu: SDK kurulumuna kadar simulasyon
    if (type === 'ad') {
      // TODO: AdMob entegrasyonu (Görev 13)
      ThemedAlert.alert('📺 Loading Ad...', 'Ad will play here when AdMob is integrated.', [
        { text: 'Skip (Dev)', onPress: () => processBuyAttempt('ad') },
      ])
      return
    }

    // RC senaryosu: doğrudan onay
    processBuyAttempt('rc')
  }

  const processBuyAttempt = async (type: 'ad' | 'rc') => {
    if (!userId) return
    const result = await buyDungeonAttempt(userId, type)

    if (!result) {
      ThemedAlert.alert('Error', 'Failed to buy attempt. Try again.')
      return
    }

    if (!result.success) {
      const errorMessages: Record<string, string> = {
        AD_ATTEMPTS_EXHAUSTED: `You've used all ${result.max ?? 3} ad attempts today.`,
        RC_ATTEMPTS_EXHAUSTED: `You've used all ${result.max ?? 3} RC attempts today.`,
        INSUFFICIENT_RC: `Need ${result.required} RC. Balance: ${result.balance}.`,
      }
      ThemedAlert.alert('Cannot Buy Attempt', errorMessages[result.error ?? ''] ?? result.error ?? 'Unknown error')
      return
    }

    // Başarılı — state'i güncelle
    await fetchPlayerState(userId)

    if (type === 'ad') {
      ThemedAlert.alert('✅ Attempt Added', `Free attempt unlocked!\n${result.extra_attempts_ad ?? 0}/${result.max_extra_ad ?? 3} ad attempts used.`)
    } else {
      ThemedAlert.alert('✅ Attempt Added', `Spent ${result.rc_cost} RC.\n${result.extra_attempts_rc ?? 0}/${result.max_extra_rc ?? 3} RC attempts used.`)
    }
  }

  const handleBattle = async () => {
    if (!userId || !playerState) return

    const { dungeon } = playerState

    if (dungeon.attempts_today >= dungeon.max_attempts) {
      const adRemaining = (dungeon.max_extra_ad ?? 3) - (dungeon.extra_attempts_ad ?? 0)
      const rcRemaining = (dungeon.max_extra_rc ?? 3) - (dungeon.extra_attempts_rc ?? 0)
      const rcCost = Math.max(5, Math.min(50, Math.floor(dungeon.current_floor / 10) + 5))

      ThemedAlert.alert(
        '⚔️ Out of Attempts',
        `Daily attempts exhausted.\nResets at UTC 00:00\n\n` +
        `📺 Watch Ad: ${adRemaining}/3 left\n` +
        `💸 Use RC: ${rcRemaining}/3 left (${rcCost} RC each)`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `📺 Watch Ad (${adRemaining} left)`,
            onPress: () => handleBuyAttempt('ad'),
          },
          {
            text: `💸 ${rcCost} RC (${rcRemaining} left)`,
            onPress: () => handleBuyAttempt('rc'),
          },
        ]
      )
      return
    }

    try {
      setBattling(true)
      setShowResult(false)
      resultOpacity.setValue(0)

      const result = await dungeonBattle(userId)

      if (result) {
        setLastResult(result)
        playBattleAnimation(result.result)
        await fetchPlayerState(userId)

        // Defeat popup
        if (result.result === 'defeat') {
          setTimeout(() => {
            ThemedAlert.alert(
              '💀 DEFEATED',
              `Floor ${result.floor} boss was too strong!\n\n` +
              `📌 Tips to get stronger:\n` +
              `• Complete quests to earn items\n` +
              `• Equip your best gear\n` +
              `• Upgrade your Ship modules\n` +
              `• Win Arena battles for points\n\n` +
              `Fails remaining: ${result.fails_remaining ?? result.attempts_remaining ?? 0}`,
              [
                {
                  text: '🎒 GO TO INVENTORY',
                  onPress: () => navigation.navigate('Inventory'),
                },
                {
                  text: 'TRY AGAIN',
                  style: 'cancel',
                },
              ]
            )
          }, 1500)
        }
      }
    } finally {
      setBattling(false)
    }
  }

  const getBossVisual = (floor: number) => {
    if (floor <= 50) return { emoji: '🤖', name: 'Corrupted Android', color: '#4CAF50' }
    if (floor <= 100) return { emoji: '🦾', name: 'Bio-Mechanical', color: '#2196F3' }
    if (floor <= 200) return { emoji: '👁️', name: 'Ancient Guardian', color: '#9C27B0' }
    if (floor <= 300) return { emoji: '👾', name: 'Dimensional Entity', color: '#F97316' }
    return { emoji: '💀', name: 'Omega Boss', color: '#EC4899' }
  }

  if (!playerState) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>SCANNING RIFT...</Text>
      </View>
    )
  }

  const { dungeon, stats } = playerState
  const boss = getBossVisual(dungeon.current_floor)
  // ✅ SQL calculate_boss_stats ile birebir eşleşen formül
  const getDungeonScale = (floor: number): number => {
    if (floor <= 10)  return 1.00
    if (floor <= 30)  return 1.20
    if (floor <= 50)  return 1.40
    if (floor <= 100) return 1.60
    if (floor <= 200) return 1.80
    if (floor <= 300) return 2.00
    if (floor <= 400) return 2.20
    return 2.50
  }
  const floor = dungeon.current_floor
  const scale = getDungeonScale(floor)
  const bossPower = Math.floor(stats.power_score * scale)
  const bossHP2   = Math.max(floor * 100, Math.floor(bossPower * 2.0))
  const bossATK   = Math.max(
    20 + floor * 8,
    Math.floor((50 + floor * 8) * scale),
    Math.floor(stats.power_score * 0.14)
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DUNGEON</Text>
          <View style={styles.floorBadge}>
            <Text style={styles.floorText}>FLOOR {dungeon.current_floor}</Text>
          </View>
        </View>

        {/* Attempts */}
        <View style={styles.attemptsRow}>
          {Array.from({ length: dungeon.max_attempts }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.attemptDot,
                i < dungeon.attempts_today && styles.attemptDotUsed,
              ]}
            />
          ))}
          <Text style={styles.attemptsText}>
            {dungeon.attempts_today}/{dungeon.max_attempts} fails today
          </Text>
          <Text style={styles.maxFloorText}>
            Best: Floor {dungeon.max_floor}
          </Text>
        </View>

        {/* Battle Arena */}
        <View style={styles.arena}>
          {/* Arka plan */}
          <View style={[styles.arenaBg, { borderColor: boss.color + '30' }]} />

          {/* Player */}
          <View style={styles.playerSide}>
            <Text style={styles.playerEmoji}>
              {playerState.player.class_type === 'vanguard' ? '🛡️'
                : playerState.player.class_type === 'phantom' ? '👁️'
                : '⚡'}
            </Text>
            <Text style={styles.playerName}>
              {playerState.player.username}
            </Text>
            <View style={styles.hpBar}>
              <View style={[styles.hpFill, { backgroundColor: COLORS.neonGreen }]} />
            </View>
            <Text style={styles.hpText}>{stats.total_hp} HP</Text>
          </View>

          {/* VS */}
          <Text style={styles.vsText}>VS</Text>

          {/* Boss */}
          <Animated.View
            style={[
              styles.bossSide,
              { transform: [{ translateX: bossShake }] },
            ]}
          >
            <Text style={[styles.bossEmoji, { color: boss.color }]}>
              {boss.emoji}
            </Text>
            <Text style={[styles.bossName, { color: boss.color }]}>
              {boss.name}
            </Text>
            <View style={styles.hpBar}>
              <View style={[styles.hpFill, { backgroundColor: boss.color }]} />
            </View>
            <Text style={styles.hpText}>{bossHP2} HP</Text>
          </Animated.View>

          {/* Silah animasyonu */}
          <Animated.Text
            style={[
              styles.weaponAnim,
              { transform: [{ translateX: weaponX }] },
            ]}
          >
            ⚔️
          </Animated.Text>
        </View>

        {/* Boss stats */}
        <View style={styles.bossStats}>
          <View style={styles.bossStatItem}>
            <Text style={styles.bossStatLabel}>FLOOR</Text>
            <Text style={[styles.bossStatValue, { color: boss.color }]}>
              {dungeon.current_floor}
            </Text>
          </View>
          <View style={styles.bossStatItem}>
            <Text style={styles.bossStatLabel}>BOSS HP</Text>
            <Text style={styles.bossStatValue}>{bossHP2.toLocaleString()}</Text>
          </View>
          <View style={styles.bossStatItem}>
            <Text style={styles.bossStatLabel}>BOSS ATK</Text>
            <Text style={styles.bossStatValue}>{bossATK}</Text>
          </View>
          <View style={styles.bossStatItem}>
            <Text style={styles.bossStatLabel}>YOUR PWR</Text>
            <Text style={[styles.bossStatValue, { color: COLORS.neonGreen }]}>
              {stats.power_score.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Battle Result */}
        {showResult && lastResult && (
          <Animated.View
            style={[styles.resultCard, { opacity: resultOpacity },
              lastResult.result === 'victory'
                ? { borderColor: COLORS.neonGreen }
                : { borderColor: COLORS.error }
            ]}
          >
            <Text style={[
              styles.resultTitle,
              { color: lastResult.result === 'victory' ? COLORS.neonGreen : COLORS.error }
            ]}>
              {lastResult.result === 'victory' ? '⚡ VICTORY!' : '💀 DEFEAT'}
            </Text>

            {/* Savaş detayı */}
            <View style={styles.battleDetail}>
              <Text style={styles.battleDetailText}>
                Rounds: {lastResult.rounds}
              </Text>
              <Text style={styles.battleDetailText}>
                Your HP: {lastResult.player_hp_start} → {lastResult.player_hp_end}
              </Text>
              <Text style={styles.battleDetailText}>
                Boss HP: {lastResult.boss_hp_start} → {lastResult.boss_hp_end}
              </Text>
            </View>

            {/* Ödüller */}
            {!!(lastResult.rewards) && (
              <View style={styles.rewards}>
                <Text style={styles.rewardsTitle}>REWARDS</Text>
                <View style={styles.rewardsRow}>
                  {lastResult.rewards.gold > 0 && (
                    <View style={styles.rewardItem}>
                      <Text style={styles.rewardIcon}>🪙</Text>
                      <Text style={styles.rewardValue}>
                        +{lastResult.rewards.gold}
                      </Text>
                    </View>
                  )}
                  {lastResult.rewards.scrap > 0 && (
                    <View style={styles.rewardItem}>
                      <Text style={styles.rewardIcon}>⚙️</Text>
                      <Text style={styles.rewardValue}>
                        +{lastResult.rewards.scrap}
                      </Text>
                    </View>
                  )}
                  {lastResult.rewards.items > 0 && (
                    <View style={styles.rewardItem}>
                      <Text style={styles.rewardIcon}>🎁</Text>
                      <Text style={styles.rewardValue}>
                        +{lastResult.rewards.items} items
                      </Text>
                    </View>
                  )}
                  {lastResult.rewards.rc > 0 && (
                    <View style={styles.rewardItem}>
                      <Text style={styles.rewardIcon}>💎</Text>
                      <Text style={styles.rewardValue}>
                        +{lastResult.rewards.rc} RC
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Lore fragment */}
            {!!(lastResult.lore) && (
              <View style={styles.loreBox}>
                <Text style={styles.loreTitle}>
                  📜 {lastResult.lore.title}
                </Text>
                <Text style={styles.loreContent}>
                  {lastResult.lore.content}
                </Text>
              </View>
            )}

            {/* Next floor */}
            {lastResult.result === 'victory' && (
              <Text style={styles.nextFloor}>
                → Floor {lastResult.next_floor} unlocked
              </Text>
            )}
          </Animated.View>
        )}

        {/* Battle button */}
        <TouchableOpacity
          style={[
            styles.battleButton,
            battling && styles.battleButtonDisabled,
            dungeon.attempts_today >= dungeon.max_attempts &&
              styles.battleButtonExhausted,
          ]}
          onPress={handleBattle}
          disabled={battling}
          activeOpacity={0.8}
        >
          <Text style={styles.battleButtonText}>
            {battling
              ? 'BATTLING...'
              : dungeon.attempts_today >= dungeon.max_attempts
              ? 'NO ATTEMPTS LEFT'
              : `⚔️ ENTER FLOOR ${dungeon.current_floor}`}
          </Text>
          {!battling && dungeon.attempts_today < dungeon.max_attempts && (
            <Text style={styles.battleButtonSub}>
              {dungeon.max_attempts - dungeon.attempts_today} fails remaining
            </Text>
          )}
        </TouchableOpacity>

        {/* Milestones */}
        <View style={styles.milestonesSection}>
          <Text style={styles.milestonesTitle}>MILESTONES</Text>
          {[
            { floor: 5,   rc: 0,   gold: 0,     label: 'First Steps' },
            { floor: 10,  rc: 0,   gold: 0,     label: 'Going Down' },
            { floor: 25,  rc: 20,  gold: 1000,  label: 'Going Deeper' },
            { floor: 50,  rc: 50,  gold: 2500,  label: 'Rift Walker' },
            { floor: 100, rc: 100, gold: 5000,  label: 'Dimension Breaker' },
            { floor: 200, rc: 200, gold: 10000, label: 'Signal Seeker' },
            { floor: 300, rc: 500, gold: 25000, label: 'Echo Master' },
          ].map((m) => {
            const reached = dungeon.max_floor >= m.floor
            return (
              <View
                key={m.floor}
                style={[
                  styles.milestoneRow,
                  reached && styles.milestoneCompleted,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.milestoneFloor,
                    reached && { color: COLORS.neonGreen }
                  ]}>
                    Floor {m.floor} — {m.label}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                    {m.rc > 0 && (
                      <Text style={styles.milestoneReward}>💎 {m.rc} RC</Text>
                    )}
                    {m.gold > 0 && (
                      <Text style={styles.milestoneReward}>🪙 {m.gold.toLocaleString()} Gold</Text>
                    )}
                    {m.rc === 0 && m.gold === 0 && (
                      <Text style={styles.milestoneReward}>📜 Lore unlocked</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.milestoneStatus}>
                  {reached ? '✅' : '🔒'}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.neonGreen,
    letterSpacing: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
  floorBadge: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  floorText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
  },
  attemptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.neonGreen,
  },
  attemptDotUsed: {
    backgroundColor: COLORS.border,
  },
  attemptsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
    marginLeft: 4,
  },
  maxFloorText: {
    fontSize: 11,
    color: COLORS.gold,
  },
  arena: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 160,
  },
  arenaBg: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1,
    borderRadius: 12,
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
  },
  playerEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 10,
    color: COLORS.neonGreen,
    letterSpacing: 1,
    marginBottom: 6,
  },
  hpBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.bgPanel,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  hpFill: {
    height: '100%','width': '100%',
    borderRadius: 2,
  },
  hpText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  vsText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  bossSide: {
    alignItems: 'center',
    flex: 1,
  },
  bossEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  bossName: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  weaponAnim: {
    position: 'absolute',
    fontSize: 40,
    bottom: '40%',
  },
  bossStats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  bossStatItem: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    alignItems: 'center',
  },
  bossStatLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bossStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
  battleDetail: {
    gap: 4,
    marginBottom: 12,
  },
  battleDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  rewards: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  rewardsTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 3,
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  rewardItem: {
    alignItems: 'center',
    gap: 4,
  },
  rewardIcon: { fontSize: 20 },
  rewardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.neonGreen,
  },
  loreBox: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 12,
  },
  loreTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    marginBottom: 6,
  },
  loreContent: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  nextFloor: {
    fontSize: 13,
    color: COLORS.neonGreen,
    textAlign: 'center',
    letterSpacing: 2,
  },
  battleButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.neonGreen,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
  },
  battleButtonDisabled: {
    opacity: 0.6,
  },
  battleButtonExhausted: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  battleButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 3,
  },
  battleButtonSub: {
    fontSize: 10,
    color: COLORS.bg,
    opacity: 0.7,
    marginTop: 4,
    letterSpacing: 1,
  },
  milestonesSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  milestonesTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 3,
    marginBottom: 10,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  milestoneCompleted: {
    opacity: 0.7,
  },
  milestoneFloor: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  milestoneReward: {
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  milestoneStatus: { fontSize: 16 },
})