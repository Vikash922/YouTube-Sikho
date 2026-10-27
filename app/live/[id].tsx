import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
  FadeInDown,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Radio,
  Users,
  Send,
  Hand,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Screen } from '../../src/components/common/Screen';
import { Badge } from '../../src/components/common/Badge';
import { Button } from '../../src/components/common/Button';
import {
  subscribeToSingleLiveClass,
  subscribeToLiveChat,
  sendLiveChatMessage,
  toggleHandRaise,
  canStudentJoinLiveClass,
  LiveChatMessage,
} from '../../src/services/liveClassService';
import { LiveClassData, YouTubeLiveProvider } from '../../src/services/liveStreamProvider';
import { InAppStreamPlayer } from '../../src/components/video/InAppStreamPlayer';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { firebaseFirestore } from '../../src/services/firebase';

export default function LiveRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const shouldReduceMotion = useReducedMotion();

  const [liveClass, setLiveClass] = useState<LiveClassData | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (shouldReduceMotion) return;
    pulseOpacity.value = withRepeat(
      withTiming(0.3, { duration: 800 }),
      -1,
      true
    );
  }, [shouldReduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: shouldReduceMotion ? 1 : pulseOpacity.value,
  }));

  // 1. Subscribe to Live Class doc in real time and track live viewer count
  useEffect(() => {
    if (!id) return;

    // Increment viewer count when joining room
    try {
      updateDoc(doc(firebaseFirestore, 'liveClasses', id), {
        viewerCount: increment(1),
      });
    } catch (e) {}

    const unsub = subscribeToSingleLiveClass(id, async (cls) => {
      setLiveClass(cls);
      setLoading(false);

      if (cls) {
        const allowed = await canStudentJoinLiveClass(cls, user?.uid);
        setHasPermission(allowed);
      }
    });

    return () => {
      unsub();
      // Decrement viewer count on leave
      try {
        updateDoc(doc(firebaseFirestore, 'liveClasses', id), {
          viewerCount: increment(-1),
        });
      } catch (e) {}
    };
  }, [id, user?.uid]);

  // 2. Subscribe to real-time chat
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToLiveChat(id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [id]);

  const handleSendMessage = async () => {
    if (!id || !inputMessage.trim() || sending) return;
    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      await sendLiveChatMessage(
        id,
        text,
        profile?.name || user?.displayName || 'Student',
        user?.uid
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      Alert.alert('Chat Error', err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleRaiseHand = async () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (id) {
      await toggleHandRaise(
        id,
        user?.uid || `guest_${Date.now().toString().slice(-4)}`,
        profile?.name || user?.displayName || 'Student',
        nextState
      );
    }
  };

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.textMuted, marginTop: 12 }]}>
          Connecting to Live Stream...
        </Text>
      </Screen>
    );
  }

  if (!liveClass) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center', padding: spacing.screen }}>
        <ShieldAlert size={48} color={colors.error} strokeWidth={1.75} />
        <Text style={[typography.title, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
          Live Class Not Found
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: 8, textAlign: 'center' }]}>
          This live class has ended or has been removed by the mentor.
        </Text>
        <Button
          title="Back to Live"
          variant="primary"
          onPress={() => router.back()}
          style={{ marginTop: 24, width: '100%' }}
        />
      </Screen>
    );
  }

  if (hasPermission === false) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center', padding: spacing.screen }}>
        <ShieldAlert size={48} color={colors.accent} strokeWidth={1.75} />
        <Text style={[typography.title, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
          Enrollment Required
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: 8, textAlign: 'center' }]}>
          This live class is exclusive to students enrolled in "{liveClass.courseTitle || 'this course'}".
        </Text>
        <Button
          title="View Course & Enroll"
          variant="primary"
          onPress={() => router.replace(`/course/${liveClass.courseId}` as any)}
          style={{ marginTop: 24, width: '100%' }}
        />
      </Screen>
    );
  }

  const isLive = liveClass.status === 'live';
  const isEnded = liveClass.status === 'ended';

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      {/* 1. Header Bar */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: spacing.screen,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[typography.heading, { color: colors.text }]} numberOfLines={1}>
            {liveClass.title}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {liveClass.courseTitle || 'Masterclass'}
          </Text>
        </View>

        {isLive ? (
          <Animated.View style={pulseStyle}>
            <Badge label="LIVE" variant="error" size="sm" />
          </Animated.View>
        ) : isEnded ? (
          <Badge
            label="RECORDED REPLAY"
            variant="neutral"
            size="sm"
          />
        ) : (
          <Badge
            label="SCHEDULED"
            variant="neutral"
            size="sm"
          />
        )}
      </View>

      {/* 2. In-App Video Stream Canvas (Zero Overlays on Player Surface) */}
      <View style={[styles.playerContainer, { backgroundColor: '#000000' }]}>
        <InAppStreamPlayer
          classId={id}
          streamUrl={liveClass.streamUrl}
          status={liveClass.status}
          title={liveClass.title}
          scheduledAt={liveClass.scheduledAt}
        />
      </View>

      {/* External Live Class Action Bar (Directly Below Video Player) */}
      <View
        style={[
          styles.liveActionBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingHorizontal: spacing.screen,
          },
        ]}
      >
        <View style={[styles.viewerBadge, { backgroundColor: colors.surfaceElevated }]}>
          {isLive ? (
            <>
              <Users size={12} color="#FFFFFF" strokeWidth={2} />
              <Text style={[typography.caption, { color: '#FFFFFF', marginLeft: 4, fontWeight: '600' }]}>
                {liveClass.viewerCount && liveClass.viewerCount > 0 ? liveClass.viewerCount : 1} watching
              </Text>
            </>
          ) : (
            <>
              <Sparkles size={12} color={colors.accent} strokeWidth={2} />
              <Text style={[typography.caption, { color: '#FFFFFF', marginLeft: 4, fontWeight: '600' }]}>
                Recorded Session
              </Text>
            </>
          )}
        </View>

        {/* Raise Hand only available during ACTIVE live broadcast */}
        {isLive && (
          <TouchableOpacity
            onPress={handleRaiseHand}
            style={[
              styles.raiseHandBtn,
              { backgroundColor: handRaised ? colors.accent : colors.surfaceElevated },
            ]}
          >
            <Hand size={14} color={handRaised ? colors.accentText : '#FFFFFF'} strokeWidth={2} />
            <Text
              style={[
                typography.caption,
                {
                  color: handRaised ? colors.accentText : '#FFFFFF',
                  marginLeft: 4,
                  fontWeight: '700',
                },
              ]}
            >
              {handRaised ? 'Hand Raised' : 'Raise Hand'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Live Chat Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={[
            styles.chatHeader,
            { borderBottomColor: colors.border, paddingHorizontal: spacing.screen },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[typography.heading, { color: colors.text, fontSize: 14 }]}>
              {isLive ? 'Live Chat' : 'Chat History'}
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {isLive
              ? liveClass.chatEnabled
                ? `${messages.length} messages`
                : 'Chat disabled'
              : isEnded
              ? 'Session ended • Replay'
              : 'Waiting to start'}
          </Text>
        </View>

        {/* Chat message list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.chatList, { paddingHorizontal: spacing.screen }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.uid === user?.uid;
            return (
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: item.isAdmin
                      ? colors.primaryLight
                      : isMe
                      ? colors.surfaceElevated
                      : colors.surface,
                    borderColor: item.isAdmin ? colors.primary : colors.border,
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: item.isAdmin ? colors.primary : isMe ? colors.primary : colors.textMuted,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {item.userName || 'Student'}
                  </Text>
                  {item.isAdmin && (
                    <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' }}>
                      • Host
                    </Text>
                  )}
                </View>
                <Text style={[typography.body, { color: colors.text, fontSize: 14 }]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {isLive
                  ? liveClass.chatEnabled
                    ? 'No messages yet. Say hello to the mentor!'
                    : 'Live chat is disabled for this session.'
                  : 'No chat messages for this replay session.'}
              </Text>
            </View>
          }
        />

        {/* Chat input box: only active when LIVE. When ENDED, show closed notice */}
        {isLive && liveClass.chatEnabled ? (
          <View
            style={[
              styles.inputBar,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                paddingHorizontal: spacing.screen,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                typography.body,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                  borderRadius: radius.input,
                },
              ]}
              placeholder="Ask a question or comment..."
              placeholderTextColor={colors.textMuted}
              value={inputMessage}
              onChangeText={setInputMessage}
              maxLength={300}
              editable={!sending}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputMessage.trim() || sending}
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputMessage.trim() ? colors.primary : colors.border,
                  borderRadius: radius.button,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.closedChatBar,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 14,
                paddingHorizontal: spacing.screen,
                paddingTop: 12,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
              {isEnded
                ? '🔒 Live session has concluded. Chat is closed for replay.'
                : 'Live chat is disabled for this session.'}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerContainer: {
    width: '100%',
    height: 230,
    position: 'relative',
  },
  liveActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  raiseHandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chatList: {
    paddingVertical: 12,
    gap: 8,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  closedChatBar: {
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
