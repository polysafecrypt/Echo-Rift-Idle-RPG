// =============================================
// ECHO RIFT — ERROR BOUNDARY (DEBUG)
// Yakalanmayan render hatalarını yakalar ve ekrana basar.
// "Text strings must be rendered" gibi hataları kesin component ile gösterir.
// =============================================

import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'

interface State {
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface Props {
  children: React.ReactNode
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Konsola da bas
    console.error('🔴 [ErrorBoundary] Caught error:', error.message)
    console.error('🔴 [ErrorBoundary] Component stack:', errorInfo.componentStack)
    this.setState({ error, errorInfo })
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const stack = this.state.errorInfo?.componentStack || '(no stack)'
    const errorMsg = this.state.error.message
    const errorStack = this.state.error.stack || ''

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={true}>
          <Text style={styles.header}>🔴 RENDER ERROR</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>

          <Text style={styles.sectionTitle}>📍 COMPONENT STACK</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{stack}</Text>
          </View>

          <Text style={styles.sectionTitle}>🔍 ERROR STACK</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{errorStack}</Text>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={this.handleReset}>
            <Text style={styles.resetBtnText}>RESET (Try again)</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a0010', paddingTop: 50 },
  scroll: { padding: 16, paddingBottom: 60 },
  header: {
    fontSize: 22, fontWeight: '900', color: '#FF4444',
    letterSpacing: 2, marginBottom: 14, textAlign: 'center',
  },
  errorMsg: {
    fontSize: 14, color: '#FFB0B0', marginBottom: 24,
    backgroundColor: 'rgba(255,68,68,0.15)', padding: 12, borderRadius: 6,
    borderLeftWidth: 3, borderLeftColor: '#FF4444',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '900', color: '#FFD700',
    letterSpacing: 2, marginTop: 16, marginBottom: 6,
  },
  codeBox: {
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  codeText: { fontSize: 10, color: '#a0e0a0', fontFamily: 'Courier', lineHeight: 14 },
  resetBtn: {
    marginTop: 24, padding: 14, borderWidth: 1, borderColor: '#00FF88',
    borderRadius: 4, alignItems: 'center', backgroundColor: 'rgba(0,255,136,0.1)',
  },
  resetBtnText: { color: '#00FF88', fontWeight: '900', letterSpacing: 2 },
})
