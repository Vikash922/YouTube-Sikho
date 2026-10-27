import React, { Component, ReactNode, ErrorInfo } from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

export interface SkiaErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  style?: StyleProp<ViewStyle>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const DefaultSkiaFallback: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const { colors, radius } = useTheme();
  return (
    <LinearGradient
      colors={[colors.surfaceElevated, colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.defaultFallback,
        {
          borderRadius: radius.card,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
};

export class SkiaErrorBoundary extends Component<SkiaErrorBoundaryProps, State> {
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
      return <DefaultSkiaFallback style={this.props.style} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  defaultFallback: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1,
  },
});
