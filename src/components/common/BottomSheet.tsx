import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  style,
}) => {
  const { colors, radius, typography, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const shouldReduceMotion = useReducedMotion();

  const translateY = useSharedValue(500);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = shouldReduceMotion
        ? 0
        : withSpring(0, { damping: 20, stiffness: 220 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = shouldReduceMotion
        ? 500
        : withTiming(500, { duration: 200 });
    }
  }, [visible, shouldReduceMotion]);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: 150 });
    translateY.value = withTiming(500, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: colors.backdrop },
            backdropAnimatedStyle,
          ]}
        >
          <Pressable style={styles.backdropPressable} onPress={handleClose} />
        </Animated.View>

        {/* Sheet Content */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radius.sheet, // 24px
              borderTopRightRadius: radius.sheet,
              paddingBottom: Math.max(insets.bottom, 24),
              paddingHorizontal: spacing.screen,
            },
            shadows.lg,
            sheetAnimatedStyle,
            style,
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: colors.border, borderRadius: radius.full },
              ]}
            />
          </View>

          {/* Optional Title */}
          {title ? (
            <View style={styles.header}>
              <Text
                style={[
                  typography.title,
                  { color: colors.text, textAlign: 'center' },
                ]}
              >
                {title}
              </Text>
            </View>
          ) : null}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
  },
  header: {
    paddingBottom: 16,
  },
});
