import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.screen }, style]}>
      {/* Icon in soft circular container */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderRadius: radius.full,
          },
        ]}
      >
        {icon}
      </View>

      {/* Title */}
      <Text
        style={[
          typography.title,
          styles.title,
          { color: colors.text, marginTop: spacing.lg },
        ]}
      >
        {title}
      </Text>

      {/* One-line description */}
      <Text
        style={[
          typography.body,
          styles.description,
          { color: colors.textMuted, marginTop: spacing.xs },
        ]}
      >
        {description}
      </Text>

      {/* Action Button */}
      {actionTitle && onAction ? (
        <View style={{ marginTop: spacing.xl, width: '100%', maxWidth: 240 }}>
          <Button
            title={actionTitle}
            onPress={onAction}
            size="md"
            variant="primary"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
