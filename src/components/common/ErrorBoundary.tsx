import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { darkPalette } from '../../theme/colors';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={[styles.fallbackContainer, { backgroundColor: darkPalette.background }]}>
          <View style={styles.content}>
            <View style={[styles.iconCircle, { backgroundColor: darkPalette.errorBg }]}>
              <AlertTriangle size={36} color={darkPalette.error} strokeWidth={1.75} />
            </View>
            <Text style={[styles.title, { color: darkPalette.text }]}>Oops! Something went wrong</Text>
            <Text style={[styles.subtitle, { color: darkPalette.textMuted }]}>
              An unexpected error occurred. Don't worry, your progress and data are safe.
            </Text>
            <View style={styles.btnWrapper}>
              <Button
                title="Restart & Retry"
                onPress={this.handleRetry}
                icon={<RefreshCw size={16} color="#FFFFFF" strokeWidth={1.75} />}
              />
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: 340,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnWrapper: {
    width: '100%',
    minWidth: 200,
  },
});
