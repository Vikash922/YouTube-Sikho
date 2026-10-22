import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Send,
  Users,
  Hand,
  Maximize2,
  Trash2,
  AlertCircle,
  Video,
} from 'lucide-react-native';
import { useThemeColors } from '../../src/theme';
import { firebaseAuth } from '../../src/services/firebase';
import {
  subscribeToSingleLiveClass,
  subscribeToLiveChat,
  sendLiveChatMessage,
  deleteChatMessage,
  LiveChatMessage,
} from '../../src/services/liveClassService';
import {
  LiveClassData,
  getLiveStreamProvider,
} from '../../src/services/liveStreamProvider';

export default function LiveRoomScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const colors = useThemeColors();

  const [classData, setClassData] = useState<LiveClassData | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [handCount, setHandCount] = useState(12);

  const flatListRef = useRef<FlatList>(null);
  const user = firebaseAuth.currentUser;
  const uid = user?.uid || '';

  // 1. Subscribe to Live Class details
  useEffect(() => {
    if (!classId) return;
    const unsubscribe = subscribeToSingleLiveClass(classId, (data) => {
      setClassData(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId]);

  // 2. Subscribe to Real-Time Chat
  useEffect(() => {
    if (!classId) return;
    const unsubscribe = subscribeToLiveChat(classId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => unsubscribe();
  }, [classId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !classId) return;
    setSending(true);
    try {
      await sendLiveChatMessage(classId, inputText);
      setInputText('');
    } catch (err: any) {
      Alert.alert('Chat Notice', err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!classId) return;
    Alert.alert('Delete Message', 'Remove this chat message for all viewers?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteChatMessage(classId, messageId),
      },
    ]);
  };

  const handleToggleRaiseHand = () => {
    setRaisedHand((prev) => !prev);
    setHandCount((c) => (raisedHand ? c - 1 : c + 1));
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Connecting to Live Room...
        </Text>
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <AlertCircle size={48} color={colors.semanticError} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Live Session Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backHomeBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.backHomeBtnText, { color: colors.surface }]}>
            Back to Live Tab
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const provider = getLiveStreamProvider(classData.streamProvider);
  const embedUrl = provider.getEmbedUrl(classData.streamUrl);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* 1. Header Bar */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Leave live room"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {classData.title}
          </Text>
          <View style={styles.liveIndicatorRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.semanticError }]} />
            <Text style={[styles.liveText, { color: colors.semanticError }]}>LIVE</Text>
            <Users size={12} color={colors.textSecondary} style={{ marginLeft: 6 }} />
            <Text style={[styles.viewerCount, { color: colors.textSecondary }]}>
              {classData.viewerCount || 48} watching
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleToggleRaiseHand}
          style={[
            styles.raiseHandBtn,
            {
              backgroundColor: raisedHand ? colors.accentMuted : colors.surfaceHover,
              borderColor: raisedHand ? colors.primary : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Raise hand"
        >
          <Hand size={18} color={raisedHand ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 2. Video Player Canvas (16:9 Aspect Ratio) */}
      <View style={[styles.videoContainer, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={styles.videoPlaceholder}>
          <Video size={48} color={colors.primary} />
          <Text style={[styles.streamStatusText, { color: colors.textPrimary }]}>
            {classData.status === 'live' ? 'Live Stream Active' : 'Session Ended'}
          </Text>
          <Text style={[styles.streamProviderText, { color: colors.textSecondary }]}>
            Streamed via {classData.streamProvider.toUpperCase()}
          </Text>
        </View>

        {/* Live Badge Overlay */}
        <View style={[styles.streamOverlayBadge, { backgroundColor: colors.semanticError }]}>
          <Text style={[styles.streamOverlayText, { color: colors.surface }]}>
            LIVE INTERACTIVE
          </Text>
        </View>
      </View>

      {/* 3. Live Chat Feed */}
      <View style={[styles.chatSection, { backgroundColor: colors.background }]}>
        <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.chatHeaderTitle, { color: colors.textSecondary }]}>
            Live Student Chat ({messages.length})
          </Text>
          {raisedHand && (
            <View style={[styles.raisedHandsPill, { backgroundColor: colors.accentMuted }]}>
              <Hand size={12} color={colors.primary} />
              <Text style={[styles.raisedHandsText, { color: colors.primary }]}>
                {handCount} hands raised
              </Text>
            </View>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatListContent}
          renderItem={({ item }) => {
            const isSelf = item.uid === uid;
            return (
              <View style={styles.chatMessageRow}>
                <View style={styles.chatBubbleContainer}>
                  <Text
                    style={[
                      styles.chatSender,
                      { color: isSelf ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {item.userName || 'Student'}
                  </Text>
                  <Text style={[styles.chatMessageText, { color: colors.textSecondary }]}>
                    {item.text}
                  </Text>
                </View>

                {/* Moderation delete */}
                <TouchableOpacity
                  onPress={() => handleDeleteMessage(item.id)}
                  style={styles.modDeleteBtn}
                  accessibilityLabel="Moderate message"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChatContainer}>
              <Text style={[styles.emptyChatText, { color: colors.textTertiary }]}>
                No messages yet. Ask Sir your doubts in the chat!
              </Text>
            </View>
          }
        />

        {/* Chat Input Bar */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your question for Sir..."
            placeholderTextColor={colors.textTertiary}
            maxLength={300}
            style={[
              styles.chatInput,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={sending || !inputText.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.surfaceHover,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send chat message"
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Send
                size={18}
                color={inputText.trim() ? colors.surface : colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewerCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  raiseHandBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  streamStatusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  streamProviderText: {
    fontSize: 12,
  },
  streamOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  streamOverlayText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chatSection: {
    flex: 1,
  },
  chatHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  raisedHandsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  raisedHandsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chatListContent: {
    padding: 16,
    gap: 12,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  chatBubbleContainer: {
    flex: 1,
  },
  chatSender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  chatMessageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modDeleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
  emptyChatContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyChatText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  backHomeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backHomeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
