import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  prefix?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  onClear?: () => void;
}

export const Input: React.FC<InputProps> = ({
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
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          style={[
            typography.caption,
            {
              color: error
                ? colors.error
                : isFocused
                ? colors.primary
                : colors.textMuted,
              marginBottom: spacing.xs,
              marginLeft: spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View
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

        {prefix ? (
          <Text
            style={[
              typography.body,
              { color: colors.text, marginRight: spacing.sm },
            ]}
          >
            {prefix}
          </Text>
        ) : null}

        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            styles.input,
            { color: colors.text },
            style,
          ]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {value && onClear ? (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.clearBtn}
          >
            <X size={16} color={colors.textMuted} strokeWidth={1.75} />
          </TouchableOpacity>
        ) : null}
      </View>

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
    marginVertical: 6,
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48, // 48px touch target
    height: 52,
  },
  leftIconBox: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
