import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Moon,
  Sun,
  Smartphone,
  Phone,
  MessageCircle,
  LogOut,
  ChevronRight,
  ExternalLink,
  Shield,
  FileText,
  Settings as SettingsIcon,
  HelpCircle,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore, ThemePreference } from '../../src/store/useThemeStore';
import { useConfigStore } from '../../src/store/useConfigStore';
import { useTheme } from '../../src/theme';
import { clientConfig } from '../../src/config/client.config';
import { Avatar } from '../../src/components/common/Avatar';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { BottomSheet } from '../../src/components/common/BottomSheet';
import { Button } from '../../src/components/common/Button';
import { Screen } from '../../src/components/common/Screen';
import { Header } from '../../src/components/common/Header';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, typography, radius, spacing } = useTheme();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const { user, profile, logout } = useAuthStore();
  const config = useConfigStore((state) => state.config);

  const [logoutSheetVisible, setLogoutSheetVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSelectPreference = (pref: ThemePreference) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreference(pref);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutSheetVisible(false);
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('[ProfileScreen] Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const raw = config?.supportWhatsApp || clientConfig.supportWhatsApp;
    const cleanPhone = raw.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  const handleCallSupport = () => {
    const phone = config?.supportPhone || clientConfig.supportPhone;
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Screen withTopInset>
      <Header title="My Account" subtitle="Manage your preferences and support" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. User Avatar Card (20px radius, left-aligned) */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <Card padding={spacing.base}>
            <View style={styles.profileRow}>
              <Avatar source={profile?.photoUrl} name={profile?.name} size="lg" />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={styles.nameBadgeRow}>
                  <Text style={[typography.title, { color: colors.text }]} numberOfLines={1}>
                    {profile?.name || 'Student Name'}
                  </Text>
                  <View style={{ marginLeft: 8 }}>
                    <Badge label="VERIFIED" variant="success" size="sm" />
                  </View>
                </View>
                <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>
                  {profile?.phone || user?.phoneNumber || '+91 98765 43210'}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* 2. Grouped Section: Theme Preferences (Light / Dark / System) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(160)}
          style={{ marginTop: spacing.xl }}
        >
          <Text
            style={[
              typography.caption,
              styles.sectionTitle,
              { color: colors.textMuted, marginBottom: spacing.xs, marginLeft: 4 },
            ]}
          >
            THEME & APPEARANCE
          </Text>
          <Card padding={spacing.sm}>
            <View style={styles.themeSelector}>
              {[
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'system', label: 'System', icon: Smartphone },
              ].map(({ key, label, icon: IconComponent }) => {
                const isSelected = preference === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleSelectPreference(key as ThemePreference)}
                    style={[
                      styles.themeOptionBtn,
                      {
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderRadius: radius.input, // 14px
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <IconComponent
                      size={18}
                      color={isSelected ? '#FFFFFF' : colors.textMuted}
                      strokeWidth={1.75}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        typography.small,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textMuted,
                          fontWeight: isSelected ? '600' : '500',
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        {/* 3. Grouped Section: App Settings */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={{ marginTop: spacing.xl }}
        >
          <Text
            style={[
              typography.caption,
              styles.sectionTitle,
              { color: colors.textMuted, marginBottom: spacing.xs, marginLeft: 4 },
            ]}
          >
            SETTINGS & SYSTEM
          </Text>
          <Card padding={0}>
            <TouchableOpacity
              style={[styles.menuRow, { paddingHorizontal: spacing.base }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <SettingsIcon size={20} color={colors.primary} strokeWidth={1.75} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 12 }]}>
                  App Settings & Data Safety
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* 4. Grouped Section: Help & Support */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(240)}
          style={{ marginTop: spacing.xl }}
        >
          <Text
            style={[
              typography.caption,
              styles.sectionTitle,
              { color: colors.textMuted, marginBottom: spacing.xs, marginLeft: 4 },
            ]}
          >
            HELP & SUPPORT
          </Text>
          <Card padding={0}>
            <TouchableOpacity
              style={[styles.menuRow, { paddingHorizontal: spacing.base }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/support');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <HelpCircle size={20} color={colors.primary} strokeWidth={1.75} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 12 }]}>
                  Support Tickets & FAQs
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.menuRow, { paddingHorizontal: spacing.base }]}
              onPress={handleOpenWhatsApp}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <MessageCircle size={20} color="#25D366" strokeWidth={1.75} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 12 }]}>
                  Chat on WhatsApp
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.menuRow, { paddingHorizontal: spacing.base }]}
              onPress={handleCallSupport}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Phone size={20} color={colors.primary} strokeWidth={1.75} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 12 }]}>
                  Call Support ({config?.supportPhone || clientConfig.supportPhone})
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* 5. Grouped Section: About & Legal */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(280)}
          style={{ marginTop: spacing.xl }}
        >
          <Text
            style={[
              typography.caption,
              styles.sectionTitle,
              { color: colors.textMuted, marginBottom: spacing.xs, marginLeft: 4 },
            ]}
          >
            ABOUT & LEGAL
          </Text>
          <Card padding={0}>
            <TouchableOpacity
              style={[styles.menuRow, { paddingHorizontal: spacing.base }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/legal/privacy');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Shield size={20} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 12 }]}>
                  Privacy Policy
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.menuRow, { paddingHorizontal: spacing.base }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/legal/terms');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <FileText size={20} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 12 }]}>
                  Terms of Service
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.menuRow, { paddingHorizontal: spacing.base }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/legal/refund');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <RefreshCw size={20} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 12 }]}>
                  Refund & Cancellation Policy
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* 5. Logout Button in Red at Bottom (Min 48px touch target) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(340)}
          style={{ marginTop: spacing.xl }}
        >
          <Button
            title="Log Out"
            variant="ghost"
            onPress={() => setLogoutSheetVisible(true)}
            icon={<LogOut size={18} color={colors.error} strokeWidth={1.75} />}
            textStyle={{ color: colors.error }}
          />
        </Animated.View>

        {/* App Version Footnote */}
        <View style={styles.versionContainer}>
          <Text style={[typography.caption, typography.tabular, { color: colors.textMuted }]}>
            {clientConfig.appName} v{clientConfig.version} (Build 1)
          </Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation BottomSheet */}
      <BottomSheet
        visible={logoutSheetVisible}
        onClose={() => setLogoutSheetVisible(false)}
        title="Confirm Log Out"
      >
        <View style={{ paddingVertical: spacing.base, alignItems: 'center' }}>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
            ]}
          >
            Are you sure you want to log out of {clientConfig.appName}?
          </Text>

          <Button
            title="Yes, Log Out"
            variant="danger"
            onPress={handleConfirmLogout}
            loading={loggingOut}
            icon={<LogOut size={18} color="#FFFFFF" strokeWidth={1.75} />}
          />

          <View style={{ marginTop: spacing.sm, width: '100%' }}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setLogoutSheetVisible(false)}
            />
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    letterSpacing: 0.6,
  },
  themeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    minHeight: 44,
    marginHorizontal: 3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  versionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingBottom: 10,
  },
});
