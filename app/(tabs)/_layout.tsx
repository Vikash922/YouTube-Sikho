import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { Home, BookOpen, PlayCircle, Radio, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_ICONS = {
  index: Home,
  courses: BookOpen,
  learning: PlayCircle,
  live: Radio,
  profile: User,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  courses: 'Courses',
  learning: 'Learning',
  live: 'Live',
  profile: 'Profile',
};

function AnimatedTabItem({
  route,
  isFocused,
  onPress,
  tabWidth,
  colors,
  typography,
}: any) {
  const IconComponent = TAB_ICONS[route.name as keyof typeof TAB_ICONS] || Home;
  const label = TAB_LABELS[route.name] || route.name;
  const shouldReduceMotion = useReducedMotion();

  const iconScale = useSharedValue(1);

  React.useEffect(() => {
    if (shouldReduceMotion) return;
    if (isFocused) {
      iconScale.value = withSpring(1.15, { damping: 12, stiffness: 300 }, () => {
        iconScale.value = withSpring(1, { damping: 14 });
      });
    } else {
      iconScale.value = 1;
    }
  }, [isFocused, shouldReduceMotion]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shouldReduceMotion ? 1 : iconScale.value }],
  }));

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      style={[styles.tabButton, { width: tabWidth }]}
      activeOpacity={0.8}
    >
      <Animated.View style={[styles.iconBox, animatedIconStyle]}>
        <IconComponent
          size={22}
          color={isFocused ? colors.primary : colors.textMuted}
          strokeWidth={1.75} // Strict 1.75 stroke width requirement
        />
      </Animated.View>
      <Text
        style={[
          typography.caption,
          styles.label,
          {
            color: isFocused ? colors.primary : colors.textMuted,
            fontWeight: isFocused ? '600' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, radius, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const shouldReduceMotion = useReducedMotion();

  // Floating tab bar container dimensions (20px horizontal margin)
  const barMarginHorizontal = 16;
  const totalBarWidth = SCREEN_WIDTH - barMarginHorizontal * 2;
  const tabWidth = totalBarWidth / state.routes.length;

  const indicatorX = useSharedValue(state.index * tabWidth);

  React.useEffect(() => {
    if (shouldReduceMotion) {
      indicatorX.value = state.index * tabWidth;
    } else {
      indicatorX.value = withSpring(state.index * tabWidth, {
        damping: 18,
        stiffness: 180,
      });
    }
  }, [state.index, tabWidth, shouldReduceMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          bottom: Math.max(insets.bottom + 6, 16),
          left: barMarginHorizontal,
          right: barMarginHorizontal,
        },
      ]}
    >
      <View
        style={[
          styles.tabBarPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.full, // Floating pill
          },
          shadows.lg,
        ]}
      >
        {/* Sliding Active Indicator */}
        <Animated.View
          style={[
            styles.slidingIndicatorBox,
            { width: tabWidth },
            indicatorStyle,
          ]}
        >
          <View
            style={[
              styles.activeIndicatorPill,
              {
                backgroundColor: colors.primaryGlow,
                borderRadius: radius.full,
              },
            ]}
          />
        </Animated.View>

        {/* Tab Buttons */}
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name);
            }
          };

          return (
            <AnimatedTabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              tabWidth={tabWidth}
              colors={colors}
              typography={typography}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="courses" />
      <Tabs.Screen name="learning" />
      <Tabs.Screen name="live" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
  },
  tabBarPill: {
    flexDirection: 'row',
    width: '100%',
    height: 60,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  slidingIndicatorBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicatorPill: {
    width: 48,
    height: 48,
  },
  tabButton: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconBox: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 3,
  },
});
