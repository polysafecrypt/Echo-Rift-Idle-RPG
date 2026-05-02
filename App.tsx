
// =============================================
// ECHO RIFT — APP ENTRY POINT
// =============================================

import React, { useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { Subscription } from 'expo-notifications'


import AppNavigator from './src/navigation/AppNavigator'
import NetworkMonitor from './src/lib/NetworkMonitor'
import { ThemedAlertProvider } from './src/components/ThemedAlert'
import ErrorBoundary from './src/components/ErrorBoundary'

export default function App() {
  const notificationListener = useRef<Subscription | null>(null)
  const responseListener = useRef<Subscription | null>(null)
  const navigationRef = useRef<any>(null)

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification)
      }
    )

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data
        console.log('Notification tapped:', data)
      }
    )

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  return (
    <React.Fragment>
      <StatusBar style="light" />
      <ErrorBoundary>
        <AppNavigator navigationRef={navigationRef} />
      </ErrorBoundary>
      <NetworkMonitor navigationRef={navigationRef} />
      <ThemedAlertProvider /> {/* ✅ EN ALTA — her şeyin üstünde render olur */}
    </React.Fragment>
  )
}