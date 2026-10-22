import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
