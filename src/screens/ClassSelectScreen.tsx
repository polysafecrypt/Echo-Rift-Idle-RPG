// =============================================
// ECHO RIFT — CLASS SELECT SCREEN
// =============================================

import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import { COLORS, CLASS_INFO } from '../constants'
import { RootStackParamList } from '../navigation/AppNavigator'
import { ClassType } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'

const { width } = Dimensions.get('window')

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ClassSelect'>
}

export default function ClassSelectScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<ClassType | null>(null)
  const [loading, setLoading] = useState(false)
  const scaleAnims = useRef({
    vanguard: new Animated.Value(1),
    riftmage: new Animated.Value(1),
    phantom: new Animated.Value(1),
  }).current

  const handleSelect = (classType: ClassType) => {
    setSelected(classType)
    // Seçilen kartı büyüt
    Object.keys(scaleAnims).forEach((key) => {
      Animated.spring(scaleAnims[key as ClassType], {
        toValue: key === classType ? 1.03 : 0.97,
        useNativeDriver: true,
      }).start()
    })
  }

  const handleConfirm = async () => {
    if (!selected) {
      ThemedAlert.alert('Select Protocol', 'Choose your combat protocol first.')
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Class seç + stats güncelle (RPC - RLS bypass)
      const { data: result, error } = await supabase.rpc('set_player_class', {
        p_player_id: user.id,
        p_class_type: selected,
      })

      if (error) throw error
      if (!result?.success) throw new Error(result?.error || 'Failed to set class')

      navigation.replace('Main')
    } catch (err: any) {
      ThemedAlert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>◈ INITIALIZATION PROTOCOL ◈</Text>
        <Text style={styles.headerTitle}>CHOOSE YOUR PATH</Text>
        <Text style={styles.headerDesc}>
          {'This choice defines your combat style.\nReset only at season end.'}
        </Text>
      </View>

      {/* Class kartları */}
      <ScrollView
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={false}
      >
        {(Object.keys(CLASS_INFO) as ClassType[]).map((classType) => {
          const info = CLASS_INFO[classType]
          const isSelected = selected === classType

          return (
            <Animated.View
              key={classType}
              style={{ transform: [{ scale: scaleAnims[classType] }] }}
            >
              <TouchableOpacity
                style={[
                  styles.card,
                  isSelected && {
                    borderColor: info.color,
                    backgroundColor: `${info.color}10`,
                  },
                ]}
                onPress={() => handleSelect(classType)}
                activeOpacity={0.8}
              >
                {/* Seçili indicator */}
                {!!(isSelected) && (
                  <View
                    style={[
                      styles.selectedIndicator,
                      { backgroundColor: info.color },
                    ]}
                  />
                )}

                {/* Header */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>{info.icon}</Text>
                  <View style={styles.cardTitleSection}>
                    <Text style={[styles.cardName, { color: info.color }]}>
                      {info.name}
                    </Text>
                    <Text style={styles.cardProtocol}>{info.protocol}</Text>
                  </View>
                  {!!(isSelected) && (
                    <View
                      style={[
                        styles.checkBadge,
                        { backgroundColor: info.color },
                      ]}
                    >
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </View>

                {/* Açıklama */}
                <Text style={styles.cardDesc}>{info.description}</Text>

                {/* Divider */}
                <View
                  style={[
                    styles.cardDivider,
                    { backgroundColor: isSelected ? info.color : COLORS.border },
                  ]}
                />

                {/* Bonuslar */}
                <View style={styles.bonusGrid}>
                  {info.bonuses.map((bonus, i) => (
                    <View key={i} style={styles.bonusItem}>
                      <Text
                        style={[
                          styles.bonusText,
                          {
                            color: bonus.startsWith('+')
                              ? COLORS.neonGreen
                              : COLORS.error,
                          },
                        ]}
                      >
                        {bonus}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            </Animated.View>
          )
        })}

        {/* Confirm butonu */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selected && styles.confirmButtonDisabled,
            selected && { borderColor: CLASS_INFO[selected].color },
          ]}
          onPress={handleConfirm}
          disabled={!selected || loading}
        >
          <Text
            style={[
              styles.confirmText,
              selected && { color: CLASS_INFO[selected].color },
            ]}
          >
            {loading
              ? 'INITIALIZING...'
              : selected
              ? `DEPLOY AS ${CLASS_INFO[selected].name.toUpperCase()}`
              : 'SELECT PROTOCOL'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 4,
    marginBottom: 12,
  },
  headerDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  cardProtocol: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  cardDivider: {
    height: 1,
    marginBottom: 16,
    opacity: 0.3,
  },
  bonusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bonusItem: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  confirmButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 18,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 3,
  },
})