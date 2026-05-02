// =============================================
// ECHO RIFT — SETTINGS SCREEN
// =============================================

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Switch, Linking,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'
import { ThemedAlert } from '../components/ThemedAlert'

const APP_VERSION = '0.1.0 (Beta)'

export default function SettingsScreen({ navigation }: any) {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [language, setLanguage] = useState<'EN' | 'TR'>('EN')

  useFocusEffect(
    useCallback(() => { loadData() }, [])
  )

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      setEmail(user.email || null)
    }
  }

  const handleDeleteAccount = () => {
    ThemedAlert.alert(
      '⚠️ Delete Account',
      'This action is PERMANENT. All your progress, items, and purchases will be lost forever.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: () => {
            ThemedAlert.alert(
              '🚨 Final Warning',
              'Your account will be permanently deleted. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE FOREVER',
                  style: 'destructive',
                  onPress: async () => {
                    // Hesap silme isteği gönder
                    await supabase.from('mailbox').insert({
                      player_id: userId,
                      title: 'Account Deletion Request',
                      description: `User ${email} requested account deletion at ${new Date().toISOString()}`,
                      source: 'system',
                      status: 'pending',
                    })
                    await supabase.auth.signOut()
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
                    ThemedAlert.alert('Account Deleted', 'Your account deletion request has been submitted. Your data will be removed within 30 days.')
                  }
                }
              ]
            )
          }
        }
      ]
    )
  }

  const handleLogout = async () => {
    ThemedAlert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LANGUAGE</Text>
          <View style={styles.card}>
            <View style={styles.langRow}>
              {(['EN', 'TR'] as const).map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langBtn, language === lang && styles.langBtnActive]}
                  onPress={() => {
                    setLanguage(lang)
                    ThemedAlert.alert('Coming Soon', 'Multi-language support is coming soon!')
                  }}
                >
                  <Text style={styles.langFlag}>
                    {lang === 'EN' ? '🇬🇧' : '🇹🇷'}
                  </Text>
                  <Text style={[styles.langText, language === lang && { color: COLORS.neonGreen }]}>
                    {lang === 'EN' ? 'English' : 'Turkish'}
                  </Text>
                  {language === lang && (
                    <Text style={styles.langCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Sound & Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>🔊</Text>
                <View>
                  <Text style={styles.toggleLabel}>Sound Effects</Text>
                  <Text style={styles.toggleSub}>Coming soon</Text>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: COLORS.border, true: COLORS.neonGreen }}
                thumbColor={COLORS.textPrimary}
              />
            </View>

            <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 12 }]}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>🔔</Text>
                <View>
                  <Text style={styles.toggleLabel}>Notifications</Text>
                  <Text style={styles.toggleSub}>Quest & stamina alerts</Text>
                </View>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: COLORS.border, true: COLORS.neonGreen }}
                thumbColor={COLORS.textPrimary}
              />
            </View>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL('https://echo-rift.com/privacy')}
            >
              <Text style={styles.linkText}>🔒 Privacy Policy</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>

            <View style={[styles.divider]} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL('https://echo-rift.com/terms')}
            >
              <Text style={styles.linkText}>📄 Terms of Service</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL('mailto:support@echo-rift.com')}
            >
              <Text style={styles.linkText}>📧 Contact Support</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.error }]}>DANGER ZONE</Text>
          <View style={[styles.card, { borderColor: COLORS.error + '30' }]}>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout}>
              <Text style={styles.dangerBtnText}>🚪 LOGOUT</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
              <Text style={[styles.dangerBtnText, { color: COLORS.error }]}>
                🗑️ DELETE ACCOUNT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <Text style={styles.version}>Echo Rift {APP_VERSION}</Text>
        <Text style={styles.version}>Made with ❤️ by Echo Rift Team</Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn:     { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  content:     { padding: 16 },
  section:     { marginBottom: 20 },
  sectionTitle:{ fontSize: 9, color: COLORS.textMuted, letterSpacing: 3, marginBottom: 8 },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14,
  },
  infoLabel: { fontSize: 13, color: COLORS.textMuted },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  langRow:   { flexDirection: 'row', padding: 8, gap: 8 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bgPanel, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12,
  },
  langBtnActive: { borderColor: COLORS.neonGreen, backgroundColor: COLORS.neonGreen + '10' },
  langFlag:  { fontSize: 20 },
  langText:  { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  langCheck: { fontSize: 13, color: COLORS.neonGreen, fontWeight: '900' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  toggleLeft:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon:{ fontSize: 22 },
  toggleLabel:{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  toggleSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  linkText:  { fontSize: 13, color: COLORS.textPrimary },
  linkArrow: { fontSize: 16, color: COLORS.textMuted },
  divider:   { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },
  dangerBtn: { padding: 14 },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1 },
  version: { textAlign: 'center', fontSize: 10, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 4 },
})
