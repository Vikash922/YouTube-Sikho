import React from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { DownloadCloud, ArrowUpCircle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Button } from './Button';
import { useConfigStore } from '../../store/useConfigStore';
import { clientConfig } from '../../config/client.config';

export const ForceUpdateScreen: React.FC = () => {
  const { colors } = useTheme();
  const config = useConfigStore((state) => state.config);

  const updateUrl = Platform.select({
    ios: config?.appStoreUrl || 'https://apps.apple.com',
    android: config?.playStoreUrl || 'https://play.google.com/store/apps',
    default: config?.playStoreUrl || 'https://play.google.com/store/apps',
  });

  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl).catch((err) => {
        console.warn('Could not open store URL:', err);
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
        <ArrowUpCircle size={64} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Update Required</Text>

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        A new and improved version of {config?.appName || clientConfig.appName} is available with critical performance fixes and new features. Please update to continue.
      </Text>

      <View style={[styles.versionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>Installed Version: </Text>
        <Text style={[styles.versionValue, { color: colors.text }]}>v{clientConfig.version}</Text>
        <Text style={[styles.versionLabel, { color: colors.textSecondary, marginLeft: 16 }]}>Required: </Text>
        <Text style={[styles.versionValue, { color: colors.primary }]}>v{config?.minVersion || '1.0.0'}</Text>
      </View>

      <View style={styles.buttonWrapper}>
        <Button
          title="Update Now"
          onPress={handleUpdate}
          variant="primary"
          icon={<DownloadCloud size={20} color="#FFFFFF" />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
  },
  versionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  versionLabel: {
    fontSize: 13,
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 280,
  },
});
