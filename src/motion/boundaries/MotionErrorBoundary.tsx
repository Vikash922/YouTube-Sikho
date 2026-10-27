import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

export interface MotionErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  style?: StyleProp<ViewStyle>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MotionErrorBoundary extends Component<MotionErrorBoundaryProps, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <View style={[styles.fallback, this.props.style]} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 20,
  },
});
