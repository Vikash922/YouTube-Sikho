import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We could not load this content. Please check your internet connection and try again.',
  onRetry,
  style,
}) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.screen }, style]}>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: colors.errorBg,
            borderColor: colors.border,
            borderRadius: radius.full,
          },
        ]}
      >
        <AlertCircle size={36} color={colors.error} strokeWidth={1.75} />
      </View>

      <Text
        style={[
          typography.title,
          styles.title,
          { color: colors.text, marginTop: spacing.lg },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          typography.body,
          styles.message,
          { color: colors.textMuted, marginTop: spacing.xs },
        ]}
      >
        {message}
      </Text>

      <View style={{ marginTop: spacing.xl, width: '100%', maxWidth: 220 }}>
        <Button
          title="Try Again"
          onPress={onRetry}
          icon={<RefreshCw size={16} color="#FFFFFF" strokeWidth={1.75} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 290,
  },
});
