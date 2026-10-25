import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Megaphone, ExternalLink, X } from 'lucide-react-native';
import { useConfigStore } from '../../store/useConfigStore';
import { useTheme } from '../../theme';

export const AnnouncementBanner: React.FC = () => {
  const { colors } = useTheme();
  const config = useConfigStore((state) => state.config);
  const [dismissed, setDismissed] = React.useState(false);

  if (!config?.announcementActive || !config.announcementText?.trim() || dismissed) {
    return null;
  }

  const handlePress = () => {
    if (config.announcementUrl) {
      Linking.openURL(config.announcementUrl).catch((err) => {
        console.warn('Could not open announcement URL:', err);
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <TouchableOpacity
        style={styles.contentRow}
        activeOpacity={config.announcementUrl ? 0.8 : 1}
        onPress={config.announcementUrl ? handlePress : undefined}
      >
        <Megaphone size={18} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.text} numberOfLines={2}>
          {config.announcementText}
        </Text>
        {config.announcementUrl ? (
          <ExternalLink size={16} color="#FFFFFF" style={styles.actionIcon} />
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <X size={16} color="#FFFFFF" opacity={0.8} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionIcon: {
    marginLeft: 8,
    flexShrink: 0,
  },
  closeButton: {
    paddingLeft: 10,
    paddingVertical: 2,
  },
});
