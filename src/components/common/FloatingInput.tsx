/**
 * FLOATING LABEL INPUT COMPONENT
 * -------------------------------------------------------------
 * Text input with animated floating label elevation physics,
 * focus border highlighting, and animated clear button.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { motionSprings, motionDurations } from '../../motion';

export interface FloatingInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  prefix?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  onClear?: () => void;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  error,
  prefix,
  leftIcon,
  containerStyle,
  style,
  value,
  onClear,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors, radius, typography, spacing } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<any>(null);

  const hasValue = Boolean(value && value.length > 0);
  const isFloating = isFocused || hasValue;

  const floatProgress = useSharedValue(isFloating ? 1 : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      floatProgress.value = isFloating ? 1 : 0;
    } else {
      floatProgress.value = withSpring(isFloating ? 1 : 0, motionSprings.snappy);
    }
  }, [isFloating, shouldReduceMotion, floatProgress]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Label animated transform: translateY: -22, scale: 0.82
  const labelAnimatedStyle = useAnimatedStyle(() => {
    const translateY = -22 * floatProgress.value;
    const scale = 1 - 0.18 * floatProgress.value; // 1.0 -> 0.82

    return {
      transform: [
        { translateY },
        { scale },
      ],
    };
  });

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderRadius: radius.input, // 12px
            borderWidth: isFocused ? 1.5 : 1,
            paddingHorizontal: spacing.base,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIconBox}>{leftIcon}</View> : null}

        {prefix && isFloating ? (
          <Text
            style={[
              typography.body,
              { color: colors.text, marginRight: spacing.sm },
            ]}
          >
            {prefix}
          </Text>
        ) : null}

        <View style={styles.fieldContainer}>
          {/* Floating Label */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.labelWrapper,
              labelAnimatedStyle,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                typography.body,
                {
                  color: error
                    ? colors.error
                    : isFocused
                    ? colors.primary
                    : colors.textMuted,
                  fontWeight: isFloating ? '600' : '400',
                },
              ]}
            >
              {label}
            </Text>
          </Animated.View>

          <TextInput
            ref={inputRef}
            placeholder=""
            style={[
              typography.body,
              styles.input,
              { color: colors.text },
              isFloating ? styles.inputActive : null,
              style,
            ]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </View>

        {/* Clear Button */}
        {hasValue && onClear ? (
          <Animated.View
            entering={FadeIn.duration(motionDurations.fast)}
            exiting={FadeOut.duration(motionDurations.instant)}
          >
            <TouchableOpacity
              onPress={onClear}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.clearBtn}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Clear text"
            >
              <X size={16} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </Pressable>

      {error ? (
        <Text
          style={[
            typography.caption,
            { color: colors.error, marginTop: spacing.xs, marginLeft: spacing.xs },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54, // 48px+ touch target
    height: 56,
    position: 'relative',
  },
  leftIconBox: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  labelWrapper: {
    position: 'absolute',
    left: 0,
    transformOrigin: 'left center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  inputActive: {
    marginTop: 10,
  },
  clearBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
