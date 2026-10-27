import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme';

export interface LottieErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const DefaultLottieFallback: React.FC<{
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}> = ({ style, iconSize = 36 }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.defaultContainer, style]}>
      <Sparkles size={iconSize} color={colors.primary} />
    </View>
  );
};

export class LottieErrorBoundary extends Component<LottieErrorBoundaryProps, State> {
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
      return <DefaultLottieFallback style={this.props.style} iconSize={this.props.iconSize} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  defaultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
