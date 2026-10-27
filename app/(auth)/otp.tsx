import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
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
import { OtpBoxes, OtpBoxesRef } from '../../src/components/common/OtpBoxes';
import { triggerHaptic } from '../../src/motion';

export default function OtpScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const { confirmation, phoneNumber, setUser, setProfile } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const shouldReduceMotion = useReducedMotion();

  const [code, setCode] = useState('');
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timer, setTimer] = useState(30);
  const [resendAttempts, setResendAttempts] = useState(0);
  const isSubmittingRef = useRef(false);
  const otpRef = useRef<OtpBoxesRef>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const triggerShake = () => {
    setHasError(true);
    otpRef.current?.shake();
  };

  const handleVerifyOTP = async (codeToVerify?: string) => {
    if (isSubmittingRef.current || loading || isSuccess) return;

    const codeValue = codeToVerify || code;
    if (!confirmation) {
      showToast('Session expired. Please request a new OTP.', 'error');
      return;
    }
    if (codeValue.length !== 6) {
      triggerShake();
      showToast('Please enter the full 6-digit code', 'error');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const userCredential = await confirmation.confirm(codeValue);
      const authenticatedUser = userCredential.user || firebaseAuth.currentUser;
      if (!authenticatedUser) {
        throw new Error('Authentication failed. Please verify your OTP code and try again.');
      }

      setUser(authenticatedUser);
      triggerHaptic('success', shouldReduceMotion);
      setIsSuccess(true);

      const profile = await getUserProfile(authenticatedUser.uid);
      setProfile(profile);

      setTimeout(() => {
        const pending = useAuthStore.getState().pendingRedirectRoute;
        if (!profile || !profile.name) {
          router.replace('/(auth)/profile-setup');
        } else if (pending) {
          useAuthStore.getState().setPendingRedirectRoute(null);
          router.replace(pending as any);
        } else {
          router.replace('/(tabs)');
        }
      }, 500);
    } catch (err: any) {
      console.error('[OtpScreen] Verification error:', err);
      triggerShake();
      const errCode = err?.code || '';
      let message = 'Invalid OTP. Please check the code and retry.';
      if (errCode === 'auth/invalid-verification-code') {
        message = 'Incorrect code. Please double-check and enter the 6-digit code received via SMS.';
      } else if (errCode === 'auth/code-expired') {
        message = 'Verification code has expired. Please request a new code.';
      } else if (errCode === 'auth/too-many-requests') {
        message = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (errCode === 'auth/quota-exceeded') {
        message = 'SMS quota exceeded. Please contact support or try again later.';
      } else if (errCode === 'auth/network-request-failed') {
        message = 'Network connection issue. Please check your internet and try again.';
      } else if (err?.message) {
        message = err.message;
      }
      showToast(message, 'error');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (timer > 0) return;
    if (resendAttempts >= 3) {
      showToast('Maximum resend attempts reached. Please try again after 15 minutes.', 'error');
      return;
    }
    setResendAttempts((prev) => prev + 1);
    setTimer(30);
    setCode('');
    setHasError(false);
    otpRef.current?.clear();
    triggerHaptic('medium', shouldReduceMotion);
    showToast('A new 6-digit code has been sent via SMS.', 'info');
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
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Back"
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

        {/* 6 Reusable Animated OTP Boxes */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(160)}
          style={{ width: '100%', marginTop: spacing.xl }}
        >
          <OtpBoxes
            ref={otpRef}
            length={6}
            value={code}
            onChange={(newCode) => {
              setCode(newCode);
              setHasError(false);
            }}
            error={hasError}
            autoSubmit={(autoCode) => handleVerifyOTP(autoCode)}
            disabled={loading || isSuccess}
          />
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
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Resend verification code"
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
            disabled={code.length < 6 || isSuccess}
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
