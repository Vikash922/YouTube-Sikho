import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useToastStore } from '../../src/store/useToastStore';
import { getUserProfile } from '../../src/services/userService';
import { firebaseAuth } from '../../src/services/firebase';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/common/Button';

export default function OtpScreen() {
  const router = useRouter();
  const { colors, typography, radius, spacing, shadows } = useTheme();
  const { confirmation, phoneNumber, setUser, setProfile, setConfirmation } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const shouldReduceMotion = useReducedMotion();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef<Array<any>>([]);

  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const triggerShake = () => {
    if (shouldReduceMotion) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleDigitChange = (text: string, index: number) => {
    if (text.length > 1) {
      const cleanDigits = text.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...digits];
      cleanDigits.forEach((d, idx) => {
        newDigits[idx] = d;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(cleanDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (cleanDigits.length === 6) {
        autoSubmit(cleanDigits.join(''));
      }
      return;
    }

    const val = text.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (val && index === 5) {
      const full = newDigits.join('');
      if (full.length === 6) {
        autoSubmit(full);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const autoSubmit = (otpCode: string) => {
    handleVerifyOTP(otpCode);
  };

  const handleVerifyOTP = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (!confirmation) {
      showToast('Session expired. Please request a new OTP.', 'error');
      return;
    }
    if (code.length !== 6) {
      triggerShake();
      showToast('Please enter the full 6-digit code', 'error');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await confirmation.confirm(code);
      const authenticatedUser = userCredential.user || firebaseAuth.currentUser;
      if (!authenticatedUser) {
        throw new Error('Authentication failed. Please verify your OTP code and try again.');
      }

      setUser(authenticatedUser);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSuccess(true);

      const profile = await getUserProfile(authenticatedUser.uid);
      setProfile(profile);

      setTimeout(() => {
        if (!profile || !profile.name) {
          router.replace('/(auth)/profile-setup');
        } else {
          router.replace('/(tabs)');
        }
      }, 500);
    } catch (err: any) {
      console.error('[OtpScreen] Verification error:', err);
      triggerShake();
      showToast('Invalid OTP. Please check the code and retry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(30);
    setDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('A new OTP code has been sent to your phone.', 'info');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button (48px min target) */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              marginTop: spacing.xl,
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.75} />
        </TouchableOpacity>

        {/* Heading & Subtitle (Left-aligned) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={[styles.headerSection, { marginTop: spacing.xl }]}
        >
          <Text style={[typography.display, { color: colors.text }]}>
            Verify Code
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.xs },
            ]}
          >
            We sent a 6-digit verification code to{' '}
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {phoneNumber || 'your number'}
            </Text>
          </Text>
        </Animated.View>

        {/* 6 OTP Boxes Container */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(160)}
          style={{ width: '100%', marginTop: spacing.xl }}
        >
          <Animated.View style={[styles.boxesWrapper, shakeAnimatedStyle]}>
            {digits.map((digit, index) => {
              const isFilled = Boolean(digit);
              return (
                <View
                  key={index}
                  style={[
                    styles.box,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isFilled ? colors.primary : colors.border,
                      borderRadius: radius.input, // 12px
                      borderWidth: isFilled ? 1.5 : 1,
                    },
                  ]}
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={[
                      typography.title,
                      styles.digitInput,
                      { color: colors.text },
                    ]}
                    value={digit}
                    onChangeText={(t) => handleDigitChange(t, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!loading && !isSuccess}
                  />
                </View>
              );
            })}
          </Animated.View>
        </Animated.View>

        {/* Resend Link & Timer */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(220)}
          style={[styles.resendSection, { marginTop: spacing.lg }]}
        >
          {timer > 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Resend code in{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                00:{timer < 10 ? `0${timer}` : timer}
              </Text>
            </Text>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              style={styles.resendBtn}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color={colors.primary} strokeWidth={1.75} style={{ marginRight: 6 }} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Primary Action Button */}
        <View style={{ marginTop: spacing.xl }}>
          <Button
            title={isSuccess ? 'Verified!' : 'Verify & Continue'}
            onPress={() => handleVerifyOTP()}
            loading={loading}
            disabled={digits.some((d) => !d) || isSuccess}
            icon={isSuccess ? <Check size={18} color="#FFFFFF" strokeWidth={1.75} /> : undefined}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  headerSection: {
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
  resendSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 44,
  },
});
