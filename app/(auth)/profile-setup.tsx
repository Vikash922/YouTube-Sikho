import React, { useState } from 'react';
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
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, ArrowRight, User as UserIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useToastStore } from '../../src/store/useToastStore';
import { saveUserProfile, getUserProfile } from '../../src/services/userService';
import { firebaseAuth } from '../../src/services/firebase';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { BottomSheet } from '../../src/components/common/BottomSheet';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { colors, typography, radius, spacing, shadows } = useTheme();
  const { user, phoneNumber, setProfile } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const shouldReduceMotion = useReducedMotion();

  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState(DEFAULT_AVATARS[0]);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarScale = useSharedValue(1);

  const triggerAvatarBounce = () => {
    if (shouldReduceMotion) return;
    avatarScale.value = withSpring(1.08, { damping: 10 }, () => {
      avatarScale.value = withSpring(1, { damping: 12 });
    });
  };

  const handlePickFromGallery = async () => {
    setPhotoSheetVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      triggerAvatarBounce();
    }
  };

  const handleTakePhoto = async () => {
    setPhotoSheetVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast('Camera permission required', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      triggerAvatarBounce();
    }
  };

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    const currentUser = firebaseAuth.currentUser;
    const activeUid = currentUser?.uid || user?.uid;
    if (!activeUid) {
      setError('You must be signed in to set up your profile.');
      setLoading(false);
      router.replace('/(auth)/login');
      return;
    }

    try {
      await saveUserProfile(activeUid, {
        name: name.trim(),
        phone: user?.phoneNumber || phoneNumber,
        photoUrl: avatarUri,
      });

      const updatedProfile = await getUserProfile(activeUid);
      if (updatedProfile) {
        setProfile(updatedProfile);
      } else {
        setProfile({
          uid: activeUid,
          name: name.trim(),
          phone: user?.phoneNumber || phoneNumber,
          photoUrl: avatarUri,
          isBlocked: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (firestoreErr: any) {
      console.warn('[ProfileSetupScreen] Firestore fallback note:', firestoreErr?.message);
      setProfile({
        uid: activeUid,
        name: name.trim(),
        phone: user?.phoneNumber || phoneNumber,
        photoUrl: avatarUri,
        isBlocked: false,
        createdAt: new Date().toISOString(),
      });
    }

    showToast('Profile created successfully!', 'success');
    const pending = useAuthStore.getState().pendingRedirectRoute;
    if (pending) {
      useAuthStore.getState().setPendingRedirectRoute(null);
      router.replace(pending as any);
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shouldReduceMotion ? 1 : avatarScale.value }],
  }));

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
        {/* Title & Subtitle (Left-aligned) */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={[styles.headerSection, { marginTop: spacing['2xl'] }]}
        >
          <Text style={[typography.display, { color: colors.text }]}>
            Set Up Profile
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.xs },
            ]}
          >
            Personalize your learning experience.
          </Text>
        </Animated.View>

        {/* Centered Avatar Picker */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(160)}
          style={[styles.avatarSection, { marginTop: spacing.xl }]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPhotoSheetVisible(true)}
            style={styles.avatarButton}
          >
            <Animated.View style={[styles.avatarWrapper, avatarAnimatedStyle]}>
              <Image
                source={{ uri: avatarUri }}
                style={[
                  styles.avatarImage,
                  {
                    borderRadius: radius.full,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
                contentFit="cover"
                transition={200}
              />
              {/* Camera Badge in Thumb-Zone Corner */}
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.surface,
                    borderRadius: radius.full,
                  },
                  shadows.sm,
                ]}
              >
                <Camera size={14} color="#FFFFFF" strokeWidth={1.75} />
              </View>
            </Animated.View>
          </TouchableOpacity>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Tap to change photo
          </Text>
        </Animated.View>

        {/* 2 Fields: Full Name + Phone Display */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(220)}
          style={[styles.formSection, { marginTop: spacing.xl }]}
        >
          {/* Field 1: Full Name */}
          <Input
            label="Full Name"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError(null);
            }}
            error={error}
            autoFocus
            leftIcon={<UserIcon size={18} color={colors.textMuted} strokeWidth={1.75} />}
          />

          {/* Field 2: Phone / Account (Readonly display) */}
          <View style={{ marginTop: spacing.sm }}>
            <Input
              label="Registered Phone / Account"
              value={user?.phoneNumber || phoneNumber || user?.email || ''}
              editable={false}
              style={{ color: colors.textMuted }}
            />
          </View>
        </Animated.View>

        {/* One Primary Button */}
        <View style={{ marginTop: spacing.xl }}>
          <Button
            title="Complete Setup"
            onPress={handleSave}
            loading={loading}
            disabled={name.trim().length < 2}
            icon={<ArrowRight size={18} color="#FFFFFF" strokeWidth={1.75} />}
          />
        </View>
      </ScrollView>

      {/* Avatar Picker Bottom Sheet */}
      <BottomSheet
        visible={photoSheetVisible}
        onClose={() => setPhotoSheetVisible(false)}
        title="Choose Profile Photo"
      >
        <View style={{ paddingVertical: spacing.sm }}>
          <TouchableOpacity
            style={[
              styles.sheetOption,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.input,
                padding: spacing.base,
                marginBottom: spacing.sm,
              },
            ]}
            onPress={handleTakePhoto}
          >
            <Camera size={20} color={colors.primary} strokeWidth={1.75} />
            <Text style={[typography.heading, { color: colors.text, fontSize: 15, marginLeft: 12 }]}>
              Take a Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sheetOption,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.input,
                padding: spacing.base,
              },
            ]}
            onPress={handlePickFromGallery}
          >
            <ImageIcon size={20} color={colors.primary} strokeWidth={1.75} />
            <Text style={[typography.heading, { color: colors.text, fontSize: 15, marginLeft: 12 }]}>
              Choose from Gallery
            </Text>
          </TouchableOpacity>
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
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderWidth: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    width: '100%',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
});
