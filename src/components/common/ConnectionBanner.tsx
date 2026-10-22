import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useRealtimeStatus } from '../../services/realtimeManager';

export const ConnectionBanner: React.FC = () => {
  const status = useRealtimeStatus();
  const { colors, typography, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  if (status === 'online') return null;

  const isReconnecting = status === 'reconnecting';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container,
        {
          top: insets.top + 6,
          backgroundColor: isReconnecting ? colors.surface : colors.error,
          borderColor: isReconnecting ? colors.accent : colors.border,
          borderRadius: radius.full,
        },
        shadows.sm,
      ]}
      pointerEvents="none"
    >
      {isReconnecting ? (
        <RefreshCw size={13} color={colors.accent} strokeWidth={2} style={styles.icon} />
      ) : (
        <WifiOff size={13} color="#FFFFFF" strokeWidth={2} style={styles.icon} />
      )}
      <Text
        style={[
          typography.caption,
          {
            color: isReconnecting ? colors.text : '#FFFFFF',
            fontWeight: '600',
            fontSize: 12,
          },
        ]}
      >
        {isReconnecting ? 'Reconnecting live link...' : 'Offline mode'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    zIndex: 99999,
  },
  icon: {
    marginRight: 6,
  },
});