import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-60);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);

      if (offline) {
        translateY.value = withSpring(insets.top, { damping: 14 });
      } else {
        translateY.value = withTiming(-60, { duration: 200 });
      }
    });

    return () => unsubscribe();
  }, [insets.top]);

  const handleRetry = () => {
    NetInfo.fetch().then((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
      if (!offline) {
        translateY.value = withTiming(-60, { duration: 200 });
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: colors.error, top: 0 },
        animatedStyle,
      ]}
    >
      <WifiOff size={16} color="#FFFFFF" />
      <Text style={[typography.caption, styles.text]}>
        No internet connection. Offline mode.
      </Text>
      <TouchableOpacity
        onPress={handleRetry}
        style={styles.retryBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <RefreshCw size={13} color="#FFFFFF" />
        <Text style={[typography.overline, styles.retryText]}>Retry</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 6,
  },
  retryText: {
    color: '#FFFFFF',
  },
});
