import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';

export interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

const SIZE_MAP = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  style,
}) => {
  const { colors, typography, radius } = useTheme();
  const dimension = SIZE_MAP[size];

  const getInitials = (str?: string) => {
    if (!str) return 'S';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const fontSize = size === 'sm' ? 12 : size === 'md' ? 14 : size === 'lg' ? 20 : 28;

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={{ width: dimension, height: dimension, borderRadius: radius.full }}
          contentFit="cover"
          transition={250}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dimension,
              height: dimension,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={[
              typography.heading,
              {
                fontSize,
                color: colors.primary,
                fontWeight: '600',
              },
            ]}
          >
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
