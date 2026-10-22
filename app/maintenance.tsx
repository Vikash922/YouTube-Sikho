import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { useConfigStore } from '../src/store/useConfigStore';
import { Button } from '../src/components/common/Button';

export default function MaintenanceScreen() {
  const { colors } = useTheme();
  const config = useConfigStore((state) => state.config);

  const handleContactSupport = () => {
    const phone = config?.supportWhatsApp || config?.supportPhone;
    if (phone) {
      Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.surface }]}>
        <Ionicons name="construct-outline" size={54} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        Under Maintenance
      </Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        We are currently upgrading our platform to serve you better.
        Please check back shortly!
      </Text>
      <Button
        title="Contact Support"
        onPress={handleContactSupport}
        variant="outline"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    width: '100%',
    maxWidth: 240,
  },
});
