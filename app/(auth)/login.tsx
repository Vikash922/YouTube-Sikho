import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Phone, Mail, Lock, User as UserIcon, ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useToastStore } from '../../src/store/useToastStore';
import { useTheme } from '../../src/theme';
import { clientConfig } from '../../src/config/client.config';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { BottomSheet } from '../../src/components/common/BottomSheet';
import {
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  loginWithGoogle,
} from '../../src/services/authService';
import { getUserProfile } from '../../src/services/userService';
import { firebaseAuth } from '../../src/services/firebase';

const COUNTRY_CODES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
];

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </Svg>
);

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, radius, spacing, shadows } = useTheme();
  const { setConfirmation, setPhoneNumber, setUser, setProfile } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);

  // Authentication mode: 'email' or 'phone'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isSignUp, setIsSignUp] = useState(false);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Phone form state
  const [rawPhone, setRawPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password sheet
  const [forgotSheetVisible, setForgotSheetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setRawPhone(cleaned);
    if (error) setError(null);
  };

  /**
   * Handle Email/Password Sign In or Sign Up
   */
  const handleEmailAuth = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (isSignUp && name.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let result;
      if (isSignUp) {
        result = await registerWithEmail(email, password, name);
        showToast('Account created successfully!', 'success');
      } else {
        result = await loginWithEmail(email, password);
        showToast('Welcome back!', 'success');
      }

      setUser(result as any);

      const profile = await getUserProfile(result.uid);
      setProfile(profile);

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[LoginScreen] Email auth error:', err);
      let msg = err.message || 'Authentication failed';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect email or password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please sign up.';
      }
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Password Reset
   */
  const handleResetPassword = async () => {
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setForgotSheetVisible(false);
      showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (err: any) {
      console.error('[LoginScreen] Reset error:', err);
      showToast(err.message || 'Could not send reset email', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  /**
   * Handle Phone OTP Request
   */
  const handleSendOTP = async () => {
    if (rawPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    const fullPhoneNumber = `${selectedCountry.code}${rawPhone}`;
    setLoading(true);
    setError(null);

    try {
      setPhoneNumber(fullPhoneNumber);
      showToast('Enter the 6-digit verification code sent to your phone', 'info');
      router.push('/(auth)/otp');
    } catch (err: any) {
      console.error('[LoginScreen] Phone Auth error:', err);
      setError(err.message || 'Failed to send OTP.');
      showToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google Sign-In
   */
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const googleUser = await loginWithGoogle();

      setUser(googleUser as any);

      const profile = await getUserProfile(googleUser.uid);
      setProfile(profile);

      showToast('Signed in with Google successfully!', 'success');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[LoginScreen] Google Sign-In error:', err);
      showToast('Google Sign-In failed. Please retry.', 'error');
    } finally {
      setGoogleLoading(false);
    }
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
        {/* Large Friendly Heading (Left-aligned, generous negative space) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={[styles.headerSection, { marginTop: spacing['2xl'] }]}
        >
          <Text style={[typography.display, { color: colors.text }]}>
            {authMethod === 'email'
              ? isSignUp
                ? 'Create Account'
                : 'Welcome Back'
              : 'Sign In with Phone'}
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.xs },
            ]}
          >
            {authMethod === 'email'
              ? isSignUp
                ? 'Join thousands of students learning today.'
                : 'Enter your credentials to continue learning.'
              : 'Enter your mobile number to get an OTP.'}
          </Text>
        </Animated.View>

        {/* Auth Method Selector (Email vs Phone) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(120)}
          style={[
            styles.tabSelector,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.input,
              marginTop: spacing.lg,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor: authMethod === 'email' ? colors.surface : 'transparent',
                borderRadius: radius.input - 2,
              },
            ]}
            onPress={() => {
              setAuthMethod('email');
              setError(null);
            }}
          >
            <Mail size={16} color={authMethod === 'email' ? colors.primary : colors.textMuted} strokeWidth={1.75} style={{ marginRight: 6 }} />
            <Text
              style={[
                typography.small,
                {
                  color: authMethod === 'email' ? colors.text : colors.textMuted,
                  fontWeight: authMethod === 'email' ? '600' : '400',
                },
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor: authMethod === 'phone' ? colors.surface : 'transparent',
                borderRadius: radius.input - 2,
              },
            ]}
            onPress={() => {
              setAuthMethod('phone');
              setError(null);
            }}
          >
            <Phone size={16} color={authMethod === 'phone' ? colors.primary : colors.textMuted} strokeWidth={1.75} style={{ marginRight: 6 }} />
            <Text
              style={[
                typography.small,
                {
                  color: authMethod === 'phone' ? colors.text : colors.textMuted,
                  fontWeight: authMethod === 'phone' ? '600' : '400',
                },
              ]}
            >
              Phone OTP
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Input Card Container */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(160)}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.card,
              padding: spacing.screen,
              marginTop: spacing.base,
            },
            shadows.sm,
          ]}
        >
          {authMethod === 'email' ? (
            /* EMAIL / PASSWORD FORM */
            <View>
              {isSignUp ? (
                <Input
                  label="Full Name"
                  placeholder="Rahul Sharma"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (error) setError(null);
                  }}
                  leftIcon={<UserIcon size={18} color={colors.textMuted} strokeWidth={1.75} />}
                />
              ) : null}

              <Input
                label="Email Address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                leftIcon={<Mail size={18} color={colors.textMuted} strokeWidth={1.75} />}
              />

              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                error={error}
                leftIcon={<Lock size={18} color={colors.textMuted} strokeWidth={1.75} />}
              />

              {!isSignUp ? (
                <TouchableOpacity
                  onPress={() => {
                    setResetEmail(email);
                    setForgotSheetVisible(true);
                  }}
                  style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 8 }}
                >
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '500' }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              ) : null}

              <View style={{ marginTop: spacing.md }}>
                <Button
                  title={isSignUp ? 'Create Account' : 'Sign In'}
                  onPress={handleEmailAuth}
                  loading={loading}
                  icon={<ArrowRight size={18} color="#FFFFFF" strokeWidth={1.75} />}
                />
              </View>

              {/* Toggle Sign In / Sign Up */}
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                style={{ alignSelf: 'center', marginTop: spacing.base }}
              >
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* PHONE NUMBER FORM */
            <View>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                Mobile Number
              </Text>

              <View style={styles.inputRow}>
                <TouchableOpacity
                  onPress={() => setCountryPickerVisible(true)}
                  style={[
                    styles.countryBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      borderRadius: radius.input,
                      marginRight: spacing.sm,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 18, marginRight: 4 }}>{selectedCountry.flag}</Text>
                  <Text style={[typography.heading, { color: colors.text, fontSize: 15 }]}>
                    {selectedCountry.code}
                  </Text>
                  <ChevronDown size={14} color={colors.textMuted} strokeWidth={1.75} style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={rawPhone}
                    onChangeText={handlePhoneChange}
                    leftIcon={<Phone size={18} color={colors.textMuted} strokeWidth={1.75} />}
                    error={error}
                    containerStyle={{ marginVertical: 0 }}
                  />
                </View>
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <Button
                  title="Continue with OTP"
                  onPress={handleSendOTP}
                  loading={loading}
                  disabled={rawPhone.length !== 10}
                  icon={<ArrowRight size={18} color="#FFFFFF" strokeWidth={1.75} />}
                />
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={[styles.dividerRow, { marginVertical: spacing.lg }]}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[typography.caption, { color: colors.textMuted, marginHorizontal: spacing.base }]}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Continue with Google Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            style={[
              styles.googleBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.button,
              },
            ]}
          >
            <GoogleIcon />
            <Text
              style={[
                typography.heading,
                { color: colors.text, fontSize: 15, marginLeft: spacing.sm },
              ]}
            >
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footnote */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(240)}
          style={[styles.footerTerms, { marginTop: spacing.xl }]}
        >
          <ShieldCheck size={14} color={colors.textMuted} strokeWidth={1.75} style={{ marginRight: 6 }} />
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            Secured by Firebase Auth for project {clientConfig.firebaseConfig.projectId}.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Forgot Password Bottom Sheet */}
      <BottomSheet
        visible={forgotSheetVisible}
        onClose={() => setForgotSheetVisible(false)}
        title="Reset Password"
      >
        <View style={{ paddingVertical: spacing.sm }}>
          <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md }]}>
            Enter your email address and we will send you a link to reset your password.
          </Text>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={resetEmail}
            onChangeText={setResetEmail}
            leftIcon={<Mail size={18} color={colors.textMuted} strokeWidth={1.75} />}
          />
          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={resetLoading}
            />
          </View>
        </View>
      </BottomSheet>

      {/* Country Picker Bottom Sheet */}
      <BottomSheet
        visible={countryPickerVisible}
        onClose={() => setCountryPickerVisible(false)}
        title="Select Country"
      >
        <View style={{ paddingVertical: spacing.sm }}>
          {COUNTRY_CODES.map((country) => (
            <TouchableOpacity
              key={country.code}
              style={[
                styles.countryItem,
                {
                  borderBottomColor: colors.border,
                  backgroundColor:
                    selectedCountry.code === country.code
                      ? colors.surfaceElevated
                      : 'transparent',
                  borderRadius: radius.input,
                  paddingHorizontal: spacing.base,
                  paddingVertical: spacing.md,
                },
              ]}
              onPress={() => {
                setSelectedCountry(country);
                setCountryPickerVisible(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{country.flag}</Text>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                {country.name}
              </Text>
              <Text style={[typography.heading, { color: colors.primary, fontSize: 15 }]}>
                {country.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerSection: {
    width: '100%',
  },
  tabSelector: {
    flexDirection: 'row',
    padding: 4,
    height: 48,
    minHeight: 48,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  card: {
    borderWidth: 1,
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    height: 50,
    borderWidth: 1,
    width: '100%',
  },
  footerTerms: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    marginVertical: 2,
  },
});
