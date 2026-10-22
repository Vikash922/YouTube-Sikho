import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../../store/useToastStore';
import { useTheme } from '../../theme';

export const ToastContainer: React.FC = () => {
  const toast = useToastStore((state) => state.toast);
  const hideToast = useToastStore((state) => state.hideToast);
  const { colors, radius, typography, shadows, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const shouldReduceMotion = useReducedMotion();

  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      if (toast.type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (toast.type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const targetY = insets.top + 12;
      translateY.value = shouldReduceMotion
        ? targetY
        : withSpring(targetY, { damping: 16, stiffness: 140 });
      opacity.value = withTiming(1, { duration: 200 });

      const timer = setTimeout(() => {
        dismiss();
      }, toast.duration || 3200);

      return () => clearTimeout(timer);
    }
  }, [toast, shouldReduceMotion]);

  const dismiss = () => {
    translateY.value = withTiming(-100, { duration: 220 });
    opacity.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(hideToast)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  const getStatusColor = () => {
    switch (toast.type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'info':
      default:
        return colors.info;
    }
  };

  const getIcon = () => {
    const iconColor = getStatusColor();
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} color={iconColor} strokeWidth={1.75} />;
      case 'error':
        return <AlertCircle size={18} color={iconColor} strokeWidth={1.75} />;
      case 'info':
      default:
        return <Info size={18} color={iconColor} strokeWidth={1.75} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          borderRadius: radius.full, // Floating pill
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
        },
        shadows.md,
        animatedStyle,
      ]}
    >
      <View style={styles.iconBox}>{getIcon()}</View>
      <Text
        style={[
          typography.small,
          styles.message,
          { color: colors.text },
        ]}
        numberOfLines={2}
      >
        {toast.message}
      </Text>
      <Pressable
        onPress={dismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.closeBtn}
      >
        <X size={14} color={colors.textMuted} strokeWidth={1.75} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48, // 48px touch target
  },
  iconBox: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontWeight: '500',
  },
  closeBtn: {
    marginLeft: 8,
    padding: 4,
  },
});
