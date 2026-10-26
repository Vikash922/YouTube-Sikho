import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Lock,
  FileArchive,
  Link as LinkIcon,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { httpsCallable } from 'firebase/functions';
import {
  firebaseFirestore,
  functions,
  collection,
  query,
  where,
  onSnapshot,
} from '../../src/services/firebase';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useScreenProtection } from '../../src/hooks/useScreenProtection';
import { checkCourseEnrollment, getCourseById, Course } from '../../src/services/courseService';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { Button } from '../../src/components/common/Button';
import { Screen } from '../../src/components/common/Screen';

export interface StudyMaterialItem {
  id: string;
  courseId: string;
  courseTitle?: string;
  title: string;
  description?: string;
  type: 'pdf' | 'zip' | 'link';
  storagePath?: string;
  externalUrl?: string;
  sizeBytes?: number;
  order: number;
  isPublished?: boolean;
}

export default function CourseMaterialsScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { colors, typography, radius, spacing } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { isScreenCaptured } = useScreenProtection(`materials_${courseId}`);

  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // 1. Check Course Details & Enrollment Status
  useEffect(() => {
    if (!courseId) return;

    let isMounted = true;
    const checkAccess = async () => {
      try {
        const [cData, enrolled] = await Promise.all([
          getCourseById(courseId),
          user?.uid ? checkCourseEnrollment(courseId, user.uid) : Promise.resolve(false),
        ]);

        if (isMounted) {
          setCourse(cData);
          setIsEnrolled(enrolled || cData?.price === 0);
        }
      } catch (err: any) {
        console.warn('[Materials] Access check error:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAccess();
    return () => {
      isMounted = false;
    };
  }, [courseId, user?.uid]);

  // 2. Real-time Listener for Published Course Study Materials
  useEffect(() => {
    if (!courseId || !isEnrolled) return;

    const q = query(
      collection(firebaseFirestore, 'materials'),
      where('courseId', '==', courseId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: StudyMaterialItem[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((m) => m.isPublished !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        setMaterials(list);
      },
      (err) => {
        console.warn('[Materials] Listener error:', err.message);
      }
    );

    return () => unsubscribe();
  }, [courseId, isEnrolled]);

  // 3. Obtain Signed Short-Lived URL & Open Material
  const handleOpenMaterial = async (item: StudyMaterialItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (item.type === 'link') {
      if (item.externalUrl) {
        Linking.openURL(item.externalUrl);
      }
      return;
    }

    setOpeningId(item.id);
    try {
      const getMaterialUrlCallable = httpsCallable<
        { courseId: string; materialId: string },
        { downloadUrl: string; expiresAt: number; title: string; fileName?: string }
      >(functions, 'getMaterialUrl');

      const res = await getMaterialUrlCallable({
        courseId: courseId!,
        materialId: item.id,
      });

      const { downloadUrl } = res.data;

      // Open signed URL directly or via browser/system viewer
      const canOpen = await Linking.canOpenURL(downloadUrl);
      if (canOpen) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Download Ready', 'Document link is generated. Tap below to view.', [
          { text: 'Open in Browser', onPress: () => Linking.openURL(downloadUrl) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Access Denied', err.message || 'Could not retrieve authorized download URL.');
    } finally {
      setOpeningId(null);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <Screen withTopInset>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12 }]}>
            Verifying course enrollment...
          </Text>
        </View>
      </Screen>
    );
  }

  // Locked State for Non-Enrolled Users
  if (!isEnrolled) {
    return (
      <Screen withTopInset>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.title, { color: colors.text, marginLeft: 12 }]}>
            Study Materials
          </Text>
        </View>

        <View style={styles.centerContainer}>
          <View style={[styles.lockIconCircle, { backgroundColor: colors.surfaceHover }]}>
            <Lock size={36} color={colors.textMuted} />
          </View>
          <Text style={[typography.headline, { color: colors.text, marginTop: 16 }]}>
            Enrolled Students Only
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginTop: 8, marginHorizontal: 24, lineHeight: 20 }]}>
            Course notes, cheat-sheets, and resource archives are reserved exclusively for students enrolled in "{course?.title || 'this course'}".
          </Text>

          <Button
            title="Enroll in Course"
            variant="primary"
            onPress={() => router.push(`/course/${courseId}` as any)}
            icon={<BookOpen size={16} color={colors.surface} />}
            style={{ marginTop: 24 }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen withTopInset>
      {/* Header */}
      <View
        style={[
          styles.headerRow,
          {
            paddingHorizontal: spacing.screen,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.title, { color: colors.text }]}>Study Materials</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {course?.title || 'Course Resources'}
          </Text>
        </View>
      </View>

      {/* Materials List */}
      <FlatList
        data={materials}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, { paddingHorizontal: spacing.screen }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={44} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[typography.title, { color: colors.text, marginTop: 14 }]}>
              No Materials Uploaded Yet
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 6 }]}>
              The instructor will upload reference notes and templates here soon.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isOpening = openingId === item.id;
          const isPdf = item.type === 'pdf';
          const isZip = item.type === 'zip';

          return (
            <Animated.View entering={FadeInDown.duration(350).delay(index * 60)}>
              <Card
                padding={spacing.base}
                style={[styles.materialCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isPdf ? colors.errorBg : isZip ? colors.warningBg : colors.accentLight,
                      },
                    ]}
                  >
                    {isPdf ? (
                      <FileText size={22} color={colors.error} />
                    ) : isZip ? (
                      <FileArchive size={22} color={colors.warning} />
                    ) : (
                      <LinkIcon size={22} color={colors.primary} />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[typography.title, { color: colors.text, fontSize: 15 }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                      <Badge
                        label={item.type.toUpperCase()}
                        variant={isPdf ? 'error' : isZip ? 'warning' : 'primary'}
                        size="sm"
                      />
                      {item.sizeBytes ? (
                        <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                          {formatFileSize(item.sizeBytes)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Open / Download Button */}
                <TouchableOpacity
                  onPress={() => handleOpenMaterial(item)}
                  disabled={isOpening}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surfaceHover,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {isOpening ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : item.type === 'link' ? (
                    <>
                      <ExternalLink size={15} color={colors.primary} />
                      <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>
                        Open External Resource
                      </Text>
                    </>
                  ) : (
                    <>
                      <Download size={15} color={colors.primary} />
                      <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>
                        Access Document (Signed URL)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </Card>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  materialCard: {
    borderRadius: 14,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
