/**
 * REUSABLE SEGMENTED TABS COMPONENT
 * -------------------------------------------------------------
 * Segmented tab strip with sliding spring indicator pill,
 * selection haptic feedback, and responsive press scaling.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { motionSprings, triggerHaptic } from '../../motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  style,
}) => {
  const { colors, radius, typography, spacing, shadows } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab)
  );

  const indicatorOffset = useSharedValue(0);

  const tabWidth = containerWidth > 0 && tabs.length > 0 ? containerWidth / tabs.length : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      const targetOffset = activeIndex * tabWidth;
      if (shouldReduceMotion) {
        indicatorOffset.value = targetOffset;
      } else {
        indicatorOffset.value = withSpring(targetOffset, motionSprings.smooth);
      }
    }
  }, [activeIndex, tabWidth, shouldReduceMotion, indicatorOffset]);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setContainerWidth(width);
    if (tabs.length > 0) {
      indicatorOffset.value = activeIndex * (width / tabs.length);
    }
  };

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorOffset.value }],
    width: tabWidth,
  }));

  const handleTabPress = (tabId: string) => {
    if (tabId === activeTab) return;
    triggerHaptic('selection', shouldReduceMotion);
    onChange(tabId);
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
        },
        style,
      ]}
    >
      {/* Sliding Indicator Pill */}
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: Math.max(4, radius.md - 2),
            },
            shadows.sm,
            indicatorAnimatedStyle,
          ]}
        />
      )}

      {/* Tab Buttons */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={isActive}
              onPress={() => handleTabPress(tab.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

interface TabButtonProps {
  tab: TabItem;
  isActive: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, isActive, onPress }) => {
  const { colors, typography, spacing, radius } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shouldReduceMotion ? 1 : scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, motionSprings.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, motionSprings.snappy);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      style={[styles.tabButton, buttonAnimatedStyle]}
    >
      {tab.icon ? (
        <View style={{ marginRight: spacing.xs }}>{tab.icon}</View>
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          typography.small,
          {
            color: isActive ? colors.primary : colors.textMuted,
            fontWeight: isActive ? '700' : '500',
          },
        ]}
      >
        {tab.label}
      </Text>
      {tab.count !== undefined ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isActive
                ? colors.primary
                : colors.surfaceElevated,
              borderRadius: radius.full,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: isActive ? '#FFFFFF' : colors.textMuted,
                fontSize: 10,
                fontWeight: '700',
              },
            ]}
          >
            {tab.count}
          </Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
