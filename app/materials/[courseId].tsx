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
  Search,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { Screen } from '../../src/components/common/Screen';
import { firebaseFirestore, collection, query, where, getDocs } from '../../src/services/firebase';

export interface StudyMaterial {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'pdf' | 'notes' | 'cheatsheet' | 'zip';
  fileSize?: string;
  downloadCount?: number;
}

export default function CourseMaterialsScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { colors, typography, radius, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pdf' | 'notes' | 'cheatsheet'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [courseId]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      if (!courseId) {
        setMaterials([]);
        return;
      }

      const q = query(
        collection(firebaseFirestore, 'materials'),
        where('courseId', '==', courseId)
      );
      const snap = await getDocs(q);
      const list: StudyMaterial[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...(doc.data() as any) });
      });

      setMaterials(list);
    } catch (err: any) {
      console.warn('[Materials] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMaterial = async (item: StudyMaterial) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDownloadingId(item.id);
    try {
      const canOpen = await Linking.canOpenURL(item.fileUrl);
      if (canOpen) {
        await Linking.openURL(item.fileUrl);
      } else {
        Alert.alert('Unable to open', 'Please install a PDF or document reader application.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not open material: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShare = async (item: StudyMaterial) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: item.title,
        message: `Download study material: "${item.title}" - ${item.fileUrl}`,
      });
    } catch (err) {
      // Ignored
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (selectedFilter === 'all') return true;
    return m.fileType === selectedFilter;
  });

  return (
    <Screen withTopInset>
      {/* Top Header */}
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
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.title, { color: colors.text }]}>Study Materials</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            PDF Notes, Formula Sheets & Resources
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filtersRow, { paddingHorizontal: spacing.screen }]}>
        {[
          { key: 'all', label: 'All Files' },
          { key: 'pdf', label: 'PDFs' },
          { key: 'cheatsheet', label: 'Cheatsheets' },
          { key: 'notes', label: 'Notes' },
        ].map((tab) => {
          const isSelected = selectedFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(tab.key as any);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.button,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textMuted,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textMuted, marginTop: 12 }]}>
            Loading course study notes...
          </Text>
        </View>
      ) : filteredMaterials.length === 0 ? (
        <View style={[styles.emptyContainer, { paddingHorizontal: spacing.screen }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
            <BookOpen size={40} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[typography.heading, { color: colors.text, marginTop: 16 }]}>
            No materials found
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, textAlign: 'center', marginTop: 8 },
            ]}
          >
            Study notes and resources will appear here once published by your instructor.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMaterials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: spacing.screen, paddingBottom: 60 },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isDownloading = downloadingId === item.id;
            return (
              <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
                <Card padding={spacing.base} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.fileTypeBadge,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <FileText size={22} color={colors.primary} strokeWidth={1.75} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[typography.heading, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.description ? (
                        <Text
                          style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      ) : null}

                      <View style={styles.metaRow}>
                        <Badge
                          label={item.fileType.toUpperCase()}
                          variant="neutral"
                          size="sm"
                        />
                        {item.fileSize ? (
                          <Text
                            style={[
                              typography.caption,
                              typography.tabular,
                              { color: colors.textMuted, marginLeft: 8 },
                            ]}
                          >
                            {item.fileSize}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Actions Row */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => handleShare(item)}
                      style={[
                        styles.iconActionBtn,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel="Share material"
                    >
                      <Share2 size={18} color={colors.textMuted} strokeWidth={1.75} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenMaterial(item)}
                      disabled={isDownloading}
                      style={[
                        styles.downloadBtn,
                        {
                          backgroundColor: colors.primary,
                          borderRadius: radius.button,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Download size={16} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 6 }} />
                          <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '600' }]}>
                            Open & Download
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              </Animated.View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 48,
    minHeight: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fileTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    flex: 1,
    marginLeft: 12,
    height: 48,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
