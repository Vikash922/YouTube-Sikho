import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Sliders,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Lock,
  FileText,
  Sparkles,
  WifiOff,
  RefreshCw,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { Screen } from '../../src/components/common/Screen';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenCapture from 'expo-screen-capture';
import {
  getCourseById,
  checkCourseEnrollment,
  Course,
  Lesson,
} from '../../src/services/courseService';
import {
  getVideoToken,
  queueProgressSave,
  executeProgressSave,
  getCourseProgress,
} from '../../src/services/videoService';

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const QUALITIES = ['Auto', '1080p', '720p', '480p', '360p'];

export default function VideoPlayerScreen() {
  const { lessonId, courseId } = useLocalSearchParams<{
    lessonId: string;
    courseId?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  // Course & Curriculum Data
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Video Playback Engine State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600); // 10 minutes default
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hlsStreamUrl, setHlsStreamUrl] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // HUD Visibility
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Active Tab below player
  const [activeTab, setActiveTab] = useState<'curriculum' | 'overview'>('curriculum');

  // Sheet States
  const [showSpeedSheet, setShowSpeedSheet] = useState(false);
  const [showQualitySheet, setShowQualitySheet] = useState(false);

  // Anti-Piracy Watermark State (Shifting position every 20s)
  const [watermarkPos, setWatermarkPos] = useState({ top: 20, left: 20 });

  // Screen Protection (Android FLAG_SECURE + iOS screen recording listener)
  const [isScreenCaptured, setIsScreenCaptured] = useState(false);

  useEffect(() => {
    let sub: any = null;
    async function activateProtection() {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        // Dev build / unsupported platform limit
      }
      try {
        sub = ScreenCapture.addScreenshotListener(() => {
          setIsScreenCaptured(true);
          setTimeout(() => setIsScreenCaptured(false), 4000);
        });
      } catch (e) {}
    }
    activateProtection();
    return () => {
      try {
        ScreenCapture.allowScreenCaptureAsync();
      } catch (e) {}
      if (sub && sub.remove) sub.remove();
    };
  }, []);

  // Real expo-video instance for Bunny HLS Stream
  const player = useVideoPlayer(hlsStreamUrl || '', (p: any) => {
    p.loop = false;
    if (hlsStreamUrl) p.play();
  });

  useEffect(() => {
    if (!player) return;
    try {
      player.playbackRate = playbackSpeed;
    } catch (e) {}
  }, [player, playbackSpeed]);

  useEffect(() => {
    if (!player) return;
    const timeSub = player.addListener('timeUpdate', (event: any) => {
      if (event?.currentTime !== undefined) {
        setCurrentTime(event.currentTime);
        if (user?.uid && courseId && currentLesson && Math.floor(event.currentTime) % 10 === 0) {
          queueProgressSave(user.uid, courseId, currentLesson.id, event.currentTime, duration);
        }
      }
      if (event?.currentDuration && event.currentDuration > 0) {
        setDuration(event.currentDuration);
      }
    });

    const statusSub = player.addListener('statusChange', (event: any) => {
      if (event?.status === 'error') {
        setPlaybackError(event.error?.message || 'Secure Bunny HLS stream unavailable.');
      } else if (event?.status === 'idle') {
        setIsBuffering(true);
      } else if (event?.status === 'readyToPlay') {
        setIsBuffering(false);
      }
    });

    const playSub = player.addListener('playingChange', (event: any) => {
      setIsPlaying(event?.isPlaying ?? false);
    });

    return () => {
      timeSub.remove();
      statusSub.remove();
      playSub.remove();
    };
  }, [player, courseId, currentLesson, duration, user?.uid]);

  // Fullscreen / Landscape StatusBar handler
  useEffect(() => {
    StatusBar.setHidden(isFullscreen, 'fade');
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [isFullscreen]);

  // 2. Load Course, Current Lesson, Enrollment & Progress
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      if (!courseId) return;
      setLoadingInitial(true);

      const [courseData, enrolled, progress] = await Promise.all([
        getCourseById(courseId),
        checkCourseEnrollment(user?.uid, courseId),
        getCourseProgress(user?.uid, courseId),
      ]);

      if (isMounted) {
        setCourse(courseData);
        setIsEnrolled(enrolled);
        if (progress?.completedLessons) {
          setCompletedLessons(progress.completedLessons);
        }

        // Find active lesson
        let foundLesson: Lesson | null = null;
        if (courseData?.sections) {
          for (const sec of courseData.sections) {
            const l = sec.lessons.find((item) => item.id === lessonId);
            if (l) {
              foundLesson = l;
              break;
            }
          }
        }

        // Fallback default lesson if not found
        if (!foundLesson && courseData?.sections?.[0]?.lessons?.[0]) {
          foundLesson = courseData.sections[0].lessons[0];
        }

        setCurrentLesson(foundLesson);
        if (foundLesson?.duration) {
          const parsedDur = Number(foundLesson.duration);
          if (Number.isFinite(parsedDur) && parsedDur > 0) {
            setDuration(parsedDur);
          } else {
            setDuration(600);
          }
        }

        // Resume position from Firestore progress if available
        const pos = Number(progress?.lessons?.[foundLesson?.id || '']?.position);
        if (Number.isFinite(pos) && pos >= 0) {
          setCurrentTime(pos);
        } else {
          setCurrentTime(0);
        }

        setLoadingInitial(false);
      }
    }

    initData();
    return () => {
      isMounted = false;
    };
  }, [courseId, lessonId, user?.uid]);

  // 3. Obtain Signed Bunny Stream HLS Token
  const loadToken = useCallback(async () => {
    if (!courseId || !currentLesson) return;
    try {
      setPlaybackError(null);
      setIsBuffering(true);
      const token = await getVideoToken(courseId, currentLesson.id);
      setHlsStreamUrl(token.hlsUrl);
      setTokenExpiresAt(token.expiresAt);
      setIsBuffering(false);
    } catch (err: any) {
      console.warn('[Player] Token retrieval error:', err);
      setPlaybackError(err.message || 'Unable to load secure video stream.');
      setIsBuffering(false);
    }
  }, [courseId, currentLesson]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  // 4. Token Expiration Auto-Refresh Timer
  useEffect(() => {
    if (!tokenExpiresAt) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = tokenExpiresAt - nowSec - 60; // refresh 1 min prior

    if (timeUntilExpiry > 0) {
      const timer = setTimeout(() => {
        loadToken();
      }, timeUntilExpiry * 1000);
      return () => clearTimeout(timer);
    }
  }, [tokenExpiresAt, loadToken]);

  // 5. Anti-Piracy Watermark Movement (every 20 seconds)
  useEffect(() => {
    const watermarkTimer = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 50) + 15;
      const randomLeft = Math.floor(Math.random() * 50) + 10;
      setWatermarkPos({ top: randomTop, left: randomLeft });
    }, 20000);
    return () => clearInterval(watermarkTimer);
  }, []);

  // 6. Playback Simulator Clock & Progress Tracker
  useEffect(() => {
    let playbackInterval: any = null;
    if (isPlaying && !isBuffering && !playbackError) {
      playbackInterval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + playbackSpeed;
          if (next >= duration) {
            // Video completed!
            setIsPlaying(false);
            if (currentLesson && !completedLessons.includes(currentLesson.id)) {
              setCompletedLessons((c) => [...c, currentLesson.id]);
            }
            if (user?.uid && courseId && currentLesson) {
              executeProgressSave(user.uid, courseId, currentLesson.id, duration, duration);
            }
            handleAutoPlayNext();
            return duration;
          }

          // Debounced progress save every 10 seconds
          if (user?.uid && courseId && currentLesson && Math.floor(next) % 10 === 0) {
            queueProgressSave(user.uid, courseId, currentLesson.id, next, duration);
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (playbackInterval) clearInterval(playbackInterval);
    };
  }, [isPlaying, isBuffering, playbackSpeed, duration, currentLesson, courseId, user?.uid, playbackError, completedLessons]);

  // Auto-hide HUD controls after 4 seconds
  const resetControlsTimer = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4000);
  };

  const handleTogglePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (player) {
      try {
        if (player.playing) {
          player.pause();
        } else {
          player.play();
        }
      } catch (e) {
        setIsPlaying((prev) => !prev);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
    resetControlsTimer();
  };

  const handleSeek = (secondsDelta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (player) {
      try {
        player.seekBy(secondsDelta);
      } catch (e) {
        setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + secondsDelta)));
      }
    } else {
      setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + secondsDelta)));
    }
    resetControlsTimer();
  };

  const handleAutoPlayNext = () => {
    if (!course?.sections) return;
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);

    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      if (isEnrolled || nextLesson.isFreePreview) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({
          pathname: '/player/[lessonId]',
          params: { lessonId: nextLesson.id, courseId: course.id },
        });
      }
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    if (lesson.id === currentLesson?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isEnrolled || lesson.isFreePreview) {
      // Save current progress before switching
      if (user?.uid && courseId && currentLesson) {
        executeProgressSave(user.uid, courseId, currentLesson.id, currentTime, duration);
      }

      router.replace({
        pathname: '/player/[lessonId]',
        params: { lessonId: lesson.id, courseId: course?.id },
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push({
        pathname: '/checkout/[courseId]',
        params: { courseId: course?.id || '' },
      });
    }
  };

  const formatTime = (secs: any) => {
    const num = Number(secs);
    if (!Number.isFinite(num) || num < 0 || isNaN(num)) {
      return '00:00';
    }
    const totalSecs = Math.floor(num);
    const m = Math.floor(totalSecs / 60);
    const s = Math.floor(totalSecs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loadingInitial) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}>
            Preparing video player stream...
          </Text>
        </View>
      </Screen>
    );
  }

  const isCurrentLessonComplete = currentLesson
    ? completedLessons.includes(currentLesson.id)
    : false;

  // Real Verified Student Identity for Anti-Piracy Watermark (No fake fallback)
  const studentIdentity = profile?.phone || profile?.email || user?.email || user?.phoneNumber;
  const shortUid = user?.uid ? user.uid.substring(0, 8) : '';
  const watermarkText = studentIdentity
    ? `${studentIdentity} • ${shortUid}`
    : (shortUid ? `ID: ${shortUid}` : '');

  return (
    <Screen>
      {/* 1. Video Player HUD Canvas (16:9 Aspect Ratio / Fullscreen Landscape) */}
      <View
        style={[
          styles.playerContainer,
          {
            backgroundColor: '#000000',
            marginTop: isFullscreen ? 0 : insets.top,
          },
          isFullscreen && styles.playerFullscreenContainer,
        ]}
      >
        {/* Tokenized Bunny Stream HLS Playback Layer (expo-video / HLS Web) */}
        {hlsStreamUrl && Platform.OS !== 'web' ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFillObject}
            nativeControls={false}
            allowsPictureInPicture
          />
        ) : hlsStreamUrl && Platform.OS === 'web' ? (
          <video
            src={hlsStreamUrl}
            autoPlay
            controls={false}
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: 'black',
            }}
          />
        ) : null}

        {/* Screen Capture / Recording Prohibited Overlay */}
        {isScreenCaptured && (
          <View style={styles.screenCaptureCover}>
            <ShieldAlert size={48} color={colors.error} />
            <Text style={[typography.headline, { color: colors.text, marginTop: 12 }]}>
              Recording Prohibited
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
              Screen capture or recording is blocked to protect intellectual property.
            </Text>
          </View>
        )}

        {/* Access Denied Overlay for Non-Enrolled Users */}
        {!isEnrolled && !currentLesson?.isFreePreview && (
          <View style={[styles.errorOverlay, { backgroundColor: colors.surface }]}>
            <Lock size={36} color={colors.primary} />
            <Text style={[typography.headline, { color: colors.text, marginTop: 12, textAlign: 'center' }]}>
              Premium Lesson Locked
            </Text>
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 6, textAlign: 'center', marginHorizontal: 24 }]}>
              Enroll in this course to unlock secure high-definition playback and downloadable resources.
            </Text>
            <Button
              title="Enroll Now to Unlock"
              size="md"
              variant="primary"
              onPress={() => router.push({ pathname: '/checkout/[courseId]', params: { courseId: course?.id || '' } })}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setShowControls((prev) => !prev);
            resetControlsTimer();
          }}
          style={styles.canvasTouchArea}
        >
          {/* Dynamic Anti-Piracy Floating Watermark (Real Identity Only) */}
          {watermarkText ? (
            <View
              pointerEvents="none"
              style={[
                styles.watermarkBox,
                { top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%` },
              ]}
            >
              <Text style={styles.watermarkText}>{watermarkText}</Text>
            </View>
          ) : null}

          {/* Buffering Indicator */}
          {isBuffering && (
            <View style={styles.bufferingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {/* Error State Banner */}
          {playbackError && (
            <View style={[styles.errorOverlay, { backgroundColor: colors.surface }]}>
              <WifiOff size={32} color={colors.error} strokeWidth={1.75} />
              <Text style={[typography.small, { color: colors.error, marginTop: 8, textAlign: 'center' }]}>
                {playbackError}
              </Text>
              <Button
                title="Retry Stream"
                size="sm"
                variant="primary"
                onPress={loadToken}
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          {/* Video Scrub Progress Line */}
          <View style={styles.bottomScrubTrack}>
            <View
              style={[
                styles.bottomScrubFilled,
                {
                  width: `${Math.min(100, (currentTime / duration) * 100)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>

          {/* HUD Controls Overlay */}
          {showControls && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.hudOverlay}>
              {/* Top Control Bar */}
              <View style={styles.topControlBar}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Return to course overview"
                  style={styles.hudPillBtn}
                >
                  <ArrowLeft size={20} color={colors.surface} strokeWidth={2} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[typography.small, { color: colors.surface, fontWeight: '700' }]} numberOfLines={1}>
                    {currentLesson?.title || 'Lesson Stream'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {currentLesson?.isFreePreview ? 'Free Preview' : 'Full Lesson'}
                  </Text>
                </View>

                {/* Speed & Quality controls */}
                <TouchableOpacity
                  onPress={() => setShowSpeedSheet(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Playback speed settings"
                  style={styles.speedButtonPill}
                >
                  <Text style={[typography.caption, { color: colors.surface, fontWeight: '700' }]}>
                    {playbackSpeed}x
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowQualitySheet(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Stream quality settings"
                  style={styles.speedButtonPill}
                >
                  <Sliders size={14} color={colors.surface} strokeWidth={2} />
                  <Text style={[typography.caption, { color: colors.surface, marginLeft: 4, fontWeight: '600' }]}>
                    {selectedQuality}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Center Playback Hub (Play/Pause & Seek 10s) */}
              <View style={styles.centerControlHub}>
                <TouchableOpacity
                  onPress={() => handleSeek(-10)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Seek backward 10 seconds"
                  style={styles.seekPill}
                >
                  <RotateCcw size={22} color={colors.surface} strokeWidth={2} />
                  <Text style={[typography.caption, { color: colors.surface, fontWeight: '700', marginTop: 2 }]}>
                    -10
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTogglePlay}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
                  style={[styles.playPauseCircle, { backgroundColor: colors.primary }]}
                >
                  {isPlaying ? (
                    <Pause size={28} color={colors.surface} strokeWidth={2.5} />
                  ) : (
                    <Play size={28} color={colors.surface} strokeWidth={2.5} style={{ marginLeft: 3 }} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSeek(10)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Seek forward 10 seconds"
                  style={styles.seekPill}
                >
                  <RotateCw size={22} color={colors.surface} strokeWidth={2} />
                  <Text style={[typography.caption, { color: colors.surface, fontWeight: '700', marginTop: 2 }]}>
                    +10
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom HUD Bar (Time display & Fullscreen) */}
              <View style={styles.bottomControlBar}>
                <Text style={[typography.caption, { color: colors.surface, fontFamily: 'monospace' }]}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>

                <TouchableOpacity
                  onPress={() => setIsFullscreen((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle fullscreen"
                  style={styles.hudPillBtn}
                >
                  {isFullscreen ? (
                    <Minimize2 size={18} color={colors.surface} strokeWidth={2} />
                  ) : (
                    <Maximize2 size={18} color={colors.surface} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. PDF Lesson View or Standard Content (Hidden during full screen) */}
      {!isFullscreen && (
        currentLesson?.type === 'pdf' ? (
        <ScrollView
          contentContainerStyle={[styles.pdfContainer, { paddingHorizontal: spacing.screen }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.pdfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={48} color={colors.primary} strokeWidth={1.5} />
            <Text style={[typography.heading, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
              {currentLesson.title}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
              Verified PDF Study Notes & Resource Blueprint
            </Text>

            <Button
              title="Open / Download PDF"
              variant="primary"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const url = (currentLesson as any).pdfUrl || currentLesson.videoId;
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                  Linking.openURL(url);
                } else {
                  Alert.alert(
                    'Document Processing',
                    'This document is currently being uploaded or updated by the instructor.'
                  );
                }
              }}
              icon={<ExternalLink size={16} color={colors.surface} strokeWidth={2} />}
              style={{ marginTop: spacing.lg, width: '100%' }}
            />
          </View>
        </ScrollView>
      ) : (
        /* 3. Under-Player Info & Curriculum Tabs */
        <ScrollView
          contentContainerStyle={[styles.scrollDetails, { paddingHorizontal: spacing.screen }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Lesson Header Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ marginTop: spacing.md }}>
            <View style={styles.lessonMetaRow}>
              <Badge
                label={currentLesson?.type.toUpperCase() || 'VIDEO'}
                variant="primary"
                size="sm"
              />
              {isCurrentLessonComplete && (
                <View style={styles.completedBadgeRow}>
                  <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                  <Text style={[typography.caption, { color: colors.success, marginLeft: 4, fontWeight: '700' }]}>
                    Completed
                  </Text>
                </View>
              )}
            </View>

            <Text style={[typography.heading, { color: colors.text, marginTop: spacing.xs }]}>
              {currentLesson?.title}
            </Text>

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {course?.title} • Instructor: {course?.instructor}
            </Text>
          </Animated.View>

          {/* Tab Selector: Curriculum vs Course Details */}
          <View style={[styles.tabBarWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('curriculum')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="View curriculum lessons list"
              style={[
                styles.tabBtn,
                activeTab === 'curriculum' && [styles.activeTabBtn, { backgroundColor: colors.background }],
              ]}
            >
              <Text
                style={[
                  typography.small,
                  {
                    color: activeTab === 'curriculum' ? colors.primary : colors.textMuted,
                    fontWeight: '700',
                  },
                ]}
              >
                Lessons ({course?.sections?.reduce((a, s) => a + s.lessons.length, 0) || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('overview')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="View course overview description"
              style={[
                styles.tabBtn,
                activeTab === 'overview' && [styles.activeTabBtn, { backgroundColor: colors.background }],
              ]}
            >
              <Text
                style={[
                  typography.small,
                  {
                    color: activeTab === 'overview' ? colors.primary : colors.textMuted,
                    fontWeight: '700',
                  },
                ]}
              >
                Course Info
              </Text>
            </TouchableOpacity>
          </View>

          {/* Curriculum Lessons List */}
          {activeTab === 'curriculum' && course?.sections && (
            <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: spacing.md }}>
              {course.sections.map((section, sIdx) => (
                <View key={section.id || sIdx} style={{ marginBottom: spacing.md }}>
                  <Text style={[typography.small, { color: colors.textMuted, fontWeight: '700', marginBottom: 6 }]}>
                    {section.title}
                  </Text>

                  {section.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLesson?.id;
                    const isUnlocked = isEnrolled || lesson.isFreePreview;
                    const isDone = completedLessons.includes(lesson.id);

                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        onPress={() => handleSelectLesson(lesson)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`${lesson.title}, ${isCurrent ? 'Currently playing' : isUnlocked ? 'Unlocked lesson' : 'Locked lesson'}`}
                        style={[
                          styles.lessonRowCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isCurrent ? colors.primary : colors.border,
                            borderWidth: isCurrent ? 1.5 : 1,
                          },
                        ]}
                      >
                        {/* Status Icon */}
                        <View
                          style={[
                            styles.lessonIconBox,
                            {
                              backgroundColor: isCurrent ? colors.primary : colors.background,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          {isDone ? (
                            <CheckCircle2 size={16} color={colors.success} strokeWidth={2} />
                          ) : isUnlocked ? (
                            <Play
                              size={14}
                              color={isCurrent ? colors.surface : colors.primary}
                              strokeWidth={2}
                            />
                          ) : (
                            <Lock size={14} color={colors.textMuted} strokeWidth={2} />
                          )}
                        </View>

                        {/* Title & Duration */}
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text
                            style={[
                              typography.small,
                              {
                                color: isUnlocked ? colors.text : colors.textMuted,
                                fontWeight: isCurrent ? '700' : '500',
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {lesson.title}
                          </Text>
                          {lesson.duration && (
                            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                              {formatTime(lesson.duration)} • {lesson.type.toUpperCase()}
                            </Text>
                          )}
                        </View>

                        {/* Badges */}
                        {lesson.isFreePreview && !isEnrolled && (
                          <View style={[styles.freePreviewPill, { borderColor: colors.accent }]}>
                            <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                              FREE
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </Animated.View>
          )}

          {/* Overview Info Tab */}
          {activeTab === 'overview' && (
            <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: spacing.md }}>
              <Card style={[styles.overviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[typography.heading, { color: colors.text }]}>About this Course</Text>
                <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, lineHeight: 22 }]}>
                  {course?.description}
                </Text>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Text style={[typography.heading, { color: colors.text }]}>Instructor</Text>
                <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
                  {course?.instructor} — Verified Educator
                </Text>
              </Card>
            </Animated.View>
          )}
        </ScrollView>
      ))}

      {/* Speed Selector Modal */}
      {showSpeedSheet && (
        <View style={styles.sheetOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.md }]}>
              Playback Speed
            </Text>
            {SPEEDS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setPlaybackSpeed(s);
                  setShowSpeedSheet(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.sheetOption,
                  playbackSpeed === s && { backgroundColor: colors.background },
                ]}
              >
                <Text style={[typography.body, { color: playbackSpeed === s ? colors.primary : colors.text }]}>
                  {s}x {s === 1.0 ? '(Normal)' : ''}
                </Text>
                {playbackSpeed === s && <CheckCircle2 size={18} color={colors.primary} strokeWidth={2} />}
              </TouchableOpacity>
            ))}
            <Button
              title="Close"
              variant="ghost"
              onPress={() => setShowSpeedSheet(false)}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      )}

      {/* Quality Selector Modal */}
      {showQualitySheet && (
        <View style={styles.sheetOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.md }]}>
              Stream Resolution
            </Text>
            {QUALITIES.map((q) => (
              <TouchableOpacity
                key={q}
                onPress={() => {
                  setSelectedQuality(q);
                  setShowQualitySheet(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.sheetOption,
                  selectedQuality === q && { backgroundColor: colors.background },
                ]}
              >
                <Text style={[typography.body, { color: selectedQuality === q ? colors.primary : colors.text }]}>
                  {q} {q === '1080p' ? '(Full HD)' : ''}
                </Text>
                {selectedQuality === q && <CheckCircle2 size={18} color={colors.primary} strokeWidth={2} />}
              </TouchableOpacity>
            ))}
            <Button
              title="Close"
              variant="ghost"
              onPress={() => setShowQualitySheet(false)}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    overflow: 'hidden',
  },
  playerFullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    aspectRatio: undefined,
    zIndex: 9999,
  },
  canvasTouchArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkBox: {
    position: 'absolute',
    opacity: 0.3,
    padding: 4,
    borderRadius: 4,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  screenCaptureCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 9999,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  bottomScrubTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bottomScrubFilled: {
    height: '100%',
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 16, 32, 0.72)',
    justifyContent: 'space-between',
    padding: 12,
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hudPillBtn: {
    width: 44,
    height: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  speedButtonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 34,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 6,
  },
  centerControlHub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  seekPill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    minHeight: 48,
  },
  playPauseCircle: {
    width: 60,
    height: 60,
    minHeight: 48,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfContainer: {
    paddingVertical: 32,
  },
  pdfCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  scrollDetails: {
    paddingBottom: 60,
  },
  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginTop: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  activeTabBtn: {
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  lessonRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 48,
  },
  lessonIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freePreviewPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  overviewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 48,
  },
});
