// =============================================
// ECHO RIFT — NAVIGATION
// =============================================

import React, { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View } from 'react-native'
import AchievementsScreen from '../screens/AchievementsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import { COLORS } from '../constants'
import { supabase } from '../lib/supabase'

import SplashScreen from '../screens/SplashScreen'
import LoginScreen from '../screens/LoginScreen'
import ClassSelectScreen from '../screens/ClassSelectScreen'
import WorldMapScreen from '../screens/WorldMapScreen'
import ShipScreen from '../screens/ShipScreen'
import DungeonScreen from '../screens/DungeonScreen'
import InventoryScreen from '../screens/InventoryScreen'
import ArenaScreen from '../screens/ArenaScreen'
import MailboxScreen from '../screens/MailboxScreen'
import LeaderboardScreen from '../screens/LeaderboardScreen'
import ProfileScreen from '../screens/ProfileScreen'
import EchoPassScreen from '../screens/EchoPassScreen'
import ShopScreen from '../screens/ShopScreen'
import DailyMissionsScreen from '../screens/DailyMissionsScreen'
import GuildScreen from '../screens/GuildScreen'
import GlobalChatScreen from '../screens/GlobalChatScreen'
import ChampionCollectionScreen from '../screens/ChampionCollectionScreen'
import SummonScreen from '../screens/SummonScreen'

export type RootStackParamList = {
  Splash: undefined
  Login: undefined
  ClassSelect: undefined
  Main: undefined
  DailyMissions: undefined
  Mailbox: undefined
  Leaderboard: undefined
  Profile: undefined
  EchoPass: undefined
  Shop: undefined
  Achievements: undefined
  Settings: undefined
  GlobalChat: undefined
  Champions: undefined
  Summon: undefined
  Guild: undefined
}

export type MainTabParamList = {
  Home: undefined
  Ship: undefined
  Dungeon: undefined
  Inventory: undefined
  Arena: undefined
  Champions: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

const TabIcon = ({ label, focused, icon }: {
  label: string; focused: boolean; icon: string
}) => (
  <View style={{ alignItems: 'center', gap: 2, width: 60 }}>
    <Text style={{ fontSize: 22 }}>{icon}</Text>
    <Text style={{
      fontSize: 9,
      color: focused ? COLORS.neonGreen : COLORS.textMuted,
      fontWeight: focused ? '700' : '400',
      letterSpacing: 0.5,
      textAlign: 'center',
    }} numberOfLines={1}>
      {label.toUpperCase()}
    </Text>
  </View>
)

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#050A0F',
          borderTopColor: '#1A3A5C',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home" component={WorldMapScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} icon="🌍" /> }} />
      <Tab.Screen name="Ship" component={ShipScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Ship" focused={focused} icon="🚀" /> }} />
      <Tab.Screen name="Dungeon" component={DungeonScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dungeon" focused={focused} icon="⚔️" /> }} />
      <Tab.Screen name="Inventory" component={InventoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Gear" focused={focused} icon="🎒" /> }} />
      <Tab.Screen name="Arena" component={ArenaScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Arena" focused={focused} icon="🏆" /> }} />
      <Tab.Screen name="Champions" component={ChampionCollectionScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Heroes" focused={focused} icon="⚡" /> }} />
    </Tab.Navigator>
  )
}

export default function AppNavigator({ navigationRef }: { navigationRef?: any }) {
  const internalRef = useRef<any>(null)
  const ref = navigationRef || internalRef

  useEffect(() => {
    // Auth state değişimini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          // Logout olunca Login'e gönder
          ref.current?.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [ref])

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ClassSelect" component={ClassSelectScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="DailyMissions" component={DailyMissionsScreen} />
        <Stack.Screen name="Mailbox" component={MailboxScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EchoPass" component={EchoPassScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="GlobalChat" component={GlobalChatScreen} />
        <Stack.Screen name="Guild" component={GuildScreen} />
        <Stack.Screen name="Champions" component={ChampionCollectionScreen} />
        <Stack.Screen name="Summon" component={SummonScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}