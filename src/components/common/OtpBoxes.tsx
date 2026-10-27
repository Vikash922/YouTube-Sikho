/**
 * REUSABLE ANIMATED OTP BOXES COMPONENT
 * -------------------------------------------------------------
 * 6-box code entry with active box scale spring, horizontal
 * error shake sequence, and tactile haptic feedback.
 */

import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { motionSprings, triggerHaptic } from '../../motion';

export interface OtpBoxesProps {
  length?: number; // Default 6
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  autoSubmit?: (code: string) => void;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export interface OtpBoxesRef {
  shake: () => void;
  focus: (index?: number) => void;
  clear: () => void;
}

export const OtpBoxes = forwardRef<OtpBoxesRef, OtpBoxesProps>(
  (
    {
      length = 6,
      value,
      onChange,
      error = false,
      autoSubmit,
      disabled = false,
      containerStyle,
    },
    ref
  ) => {
    const { colors, radius, typography } = useTheme();
    const shouldReduceMotion = useReducedMotion();
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const inputRefs = useRef<Array<any>>([]);

    const shakeX = useSharedValue(0);

    const triggerShake = () => {
      triggerHaptic('error', shouldReduceMotion);
      if (shouldReduceMotion) return;

      shakeX.value = withSequence(
        withTiming(14, { duration: 50 }),
        withTiming(-14, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    };

    useImperativeHandle(ref, () => ({
      shake: triggerShake,
      focus: (index = 0) => {
        inputRefs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
      },
      clear: () => {
        onChange('');
        inputRefs.current[0]?.focus();
      },
    }));

    useEffect(() => {
      if (error) {
        triggerShake();
      }
    }, [error]);

    const digits = Array.from({ length }, (_, i) => value[i] || '');

    const handleDigitChange = (text: string, index: number) => {
      if (text.length > 1) {
        // Multi-character input (paste)
        const clean = text.replace(/\D/g, '').slice(0, length);
        onChange(clean);
        const nextFocus = Math.min(clean.length, length - 1);
        inputRefs.current[nextFocus]?.focus();
        if (clean.length === length) {
          triggerHaptic('success', shouldReduceMotion);
          autoSubmit?.(clean);
        }
        return;
      }

      const val = text.replace(/\D/g, '');
      const newDigits = [...digits];
      newDigits[index] = val;
      const fullCode = newDigits.join('');
      onChange(fullCode);

      if (val && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (val && fullCode.length === length) {
        triggerHaptic('success', shouldReduceMotion);
        autoSubmit?.(fullCode);
      }
    };

    const handleKeyPress = (e: any, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };

    const shakeAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shakeX.value }],
    }));

    return (
      <View style={[styles.container, containerStyle]}>
        <Animated.View style={[styles.boxesWrapper, shakeAnimatedStyle]}>
          {digits.map((digit, index) => {
            const isFocused = focusedIndex === index;
            const isFilled = Boolean(digit);

            return (
              <OtpSingleBox
                key={index}
                index={index}
                digit={digit}
                isFocused={isFocused}
                isFilled={isFilled}
                hasError={error}
                disabled={disabled}
                inputRef={(el) => {
                  inputRefs.current[index] = el;
                }}
                onChangeText={(t) => handleDigitChange(t, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
              />
            );
          })}
        </Animated.View>
      </View>
    );
  }
);

OtpBoxes.displayName = 'OtpBoxes';

interface OtpSingleBoxProps {
  index: number;
  digit: string;
  isFocused: boolean;
  isFilled: boolean;
  hasError: boolean;
  disabled: boolean;
  inputRef: (el: any) => void;
  onChangeText: (text: string) => void;
  onKeyPress: (e: any) => void;
  onFocus: () => void;
  onBlur: () => void;
}

const OtpSingleBox: React.FC<OtpSingleBoxProps> = ({
  digit,
  isFocused,
  isFilled,
  hasError,
  disabled,
  inputRef,
  onChangeText,
  onKeyPress,
  onFocus,
  onBlur,
}) => {
  const { colors, radius, typography } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (shouldReduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(isFocused ? 1.04 : 1.0, motionSprings.snappy);
    }
  }, [isFocused, shouldReduceMotion, scale]);

  const boxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderColor = hasError
    ? colors.error
    : isFocused
    ? colors.primary
    : isFilled
    ? colors.primary
    : colors.border;

  return (
    <Animated.View
      style={[
        styles.box,
        {
          backgroundColor: colors.surface,
          borderColor,
          borderRadius: radius.input, // 12px
          borderWidth: isFocused ? 2 : isFilled ? 1.5 : 1,
        },
        boxAnimatedStyle,
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[
          typography.title,
          styles.digitInput,
          { color: colors.text },
        ]}
        value={digit}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="number-pad"
        maxLength={1}
        selectTextOnFocus
        editable={!disabled}
        accessibilityLabel={`OTP digit`}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  boxesWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  box: {
    flex: 1,
    height: 54,
    minHeight: 48,
    marginHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitInput: {
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
});
