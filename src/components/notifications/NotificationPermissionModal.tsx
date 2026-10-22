import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Bell, Sparkles, X, Check } from 'lucide-react-native';
import { useThemeColors } from '../../theme';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onAllow,
  onDismiss,
}) => {
  const colors = useThemeColors();

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityLabel="Dismiss background"
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
            accessibilityRole="button"
            accessibilityLabel="Close notification permission sheet"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Hero Icon */}
          <View style={[styles.iconWrapper, { backgroundColor: colors.accentMuted }]}>
            <Bell size={28} color={colors.primary} />
          </View>

          {/* Title & Body */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Never Miss a Masterclass
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Get 10-minute advance reminders before live sessions start, instant course unlock confirmations, and personalized doubt replies.
          </Text>

          {/* Value Highlights */}
          <View style={styles.highlightsList}>
            {[
              '10-minute live class start reminders',
              'Instant payment & course unlock receipts',
              'Quiz results and performance feedback',
            ].map((item, idx) => (
              <View key={idx} style={styles.highlightRow}>
                <View style={[styles.checkCircle, { backgroundColor: colors.accentMuted }]}>
                  <Check size={14} color={colors.primary} />
                </View>
                <Text style={[styles.highlightText, { color: colors.textPrimary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              onPress={onAllow}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Enable Notifications"
            >
              <Bell size={18} color={colors.surface} />
              <Text style={[styles.primaryBtnText, { color: colors.surface }]}>
                Enable Notifications
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Maybe Later"
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  highlightsList: {
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
