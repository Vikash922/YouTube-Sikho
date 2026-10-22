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
  canStudentJoinLiveClass,
  LiveChatMessage,
} from '../../src/services/liveClassService';
import { LiveClassData, YouTubeLiveProvider } from '../../src/services/liveStreamProvider';

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

  // 1. Subscribe to Live Class doc in real time
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToSingleLiveClass(id, async (cls) => {
      setLiveClass(cls);
      setLoading(false);

      if (cls) {
        const allowed = await canStudentJoinLiveClass(cls, user?.uid);
        setHasPermission(allowed);
      }
    });
    return () => unsub();
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
      await sendLiveChatMessage(id, text);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      Alert.alert('Chat Error', err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleRaiseHand = () => {
    setHandRaised((prev) => !prev);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      !handRaised ? 'Hand Raised ✋' : 'Hand Lowered',
      !handRaised
        ? 'The mentor has been notified that you have a question.'
        : 'Your question notification has been cleared.'
    );
  };

  const handleOpenStreamExternally = () => {
    if (!liveClass?.streamUrl) return;
    Linking.openURL(liveClass.streamUrl).catch(() => {
      Alert.alert('Cannot Open Link', 'Please verify your internet connection.');
    });
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
        ) : (
          <Badge
            label={liveClass.status === 'ended' ? 'ENDED' : 'SCHEDULED'}
            variant="neutral"
            size="sm"
          />
        )}
      </View>

      {/* 2. Video Stream HUD */}
      <View style={[styles.playerContainer, { backgroundColor: '#000000' }]}>
        <View style={styles.playerPlaceholder}>
          <Radio size={40} color={isLive ? colors.error : colors.textMuted} strokeWidth={1.75} />
          <Text style={[typography.title, { color: '#FFFFFF', marginTop: 12, textAlign: 'center' }]}>
            {isLive ? 'Stream is Streaming Live' : 'Class Has Ended'}
          </Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' }]}>
            {liveClass.streamProvider === 'youtube'
              ? 'Hosted via YouTube Live'
              : 'Interactive Stream Session'}
          </Text>

          {liveClass.streamUrl ? (
            <TouchableOpacity
              onPress={handleOpenStreamExternally}
              style={[
                styles.openExternalBtn,
                { backgroundColor: colors.primary, borderRadius: radius.button },
              ]}
            >
              <ExternalLink size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={[typography.small, { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }]}>
                Watch Live Video
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Viewers bar */}
        <View style={styles.playerOverlayFooter}>
          <View style={styles.viewerBadge}>
            <Users size={12} color="#FFFFFF" strokeWidth={2} />
            <Text style={[typography.caption, { color: '#FFFFFF', marginLeft: 4, fontWeight: '600' }]}>
              {liveClass.viewerCount || 42} watching
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRaiseHand}
            style={[
              styles.raiseHandBtn,
              { backgroundColor: handRaised ? colors.accent : 'rgba(255,255,255,0.2)' },
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
        </View>
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
              Live Chat
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {liveClass.chatEnabled ? `${messages.length} messages` : 'Chat disabled'}
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
                    backgroundColor: isMe ? colors.primaryLight : colors.surface,
                    borderColor: colors.border,
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    borderRadius: radius.card,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isMe ? colors.primary : colors.textMuted,
                      fontWeight: '700',
                      marginBottom: 2,
                    },
                  ]}
                >
                  {item.userName || 'Student'}
                </Text>
                <Text style={[typography.body, { color: colors.text, fontSize: 14 }]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {liveClass.chatEnabled
                  ? 'No messages yet. Say hello to the mentor!'
                  : 'Live chat is disabled for this session.'}
              </Text>
            </View>
          }
        />

        {/* Chat input box */}
        {liveClass.chatEnabled && (
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
    aspectRatio: 16 / 9,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  playerOverlayFooter: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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