import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  style,
}) => {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.base,
          paddingBottom: spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <ArrowLeft size={20} color={colors.text} strokeWidth={1.75} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleContainer}>
          <Text
            style={[
              typography.display,
              { color: colors.text, textAlign: 'left' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                typography.small,
                { color: colors.textMuted, marginTop: 2, textAlign: 'left' },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightAction ? (
          <View style={styles.rightContainer}>{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
