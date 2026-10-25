import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Radio, VideoOff, Clock, Sparkles } from 'lucide-react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { useVideoPlayer, VideoView } from 'expo-video';
import { firebaseFirestore } from '../../services/firebase';
import { SafeWebView } from './SafeWebView';
import { useTheme } from '../../theme';

interface InAppStreamPlayerProps {
  classId?: string;
  streamUrl?: string | null;
  status: 'scheduled' | 'live' | 'ended';
  title?: string;
  scheduledAt?: string;
}

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : null;
}

const DirectVideoPlayerView: React.FC<{ url: string }> = ({ url }) => {
  const { colors } = useTheme();
  const player = useVideoPlayer(url, (p: any) => {
    p.loop = false;
    p.play();
  });

  if (Platform.OS === 'web') {
    return (
      <video
        src={url}
        autoPlay
        controls
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: colors.background }}
      />
    );
  }

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      nativeControls={true}
    />
  );
};

export const InAppStreamPlayer: React.FC<InAppStreamPlayerProps> = ({
  classId,
  streamUrl,
  status,
  title,
  scheduledAt,
}) => {
  const { colors } = useTheme();
  const [liveFrame, setLiveFrame] = useState<string | null>(null);

  // Subscribe to live frame for studio broadcasts (only if live)
  useEffect(() => {
    if (!classId || status !== 'live') return;

    const unsub = onSnapshot(
      doc(firebaseFirestore, 'liveClasses', classId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.previewFrame) {
            setLiveFrame(data.previewFrame);
          }
        }
      },
      (err) => console.warn('Live frame stream error:', err)
    );

    return () => unsub();
  }, [classId, status]);

  // 1. Scheduled State
  if (status === 'scheduled') {
    return (
      <View style={styles.placeholderContainer}>
        <Clock size={36} color={colors.accent} strokeWidth={1.75} />
        <Text style={styles.placeholderTitle}>Session is Scheduled</Text>
        <Text style={[styles.placeholderSubtitle, { color: colors.textMuted }]}>
          {scheduledAt
            ? `Starts at: ${new Date(scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            : 'Waiting for instructor to go live...'}
        </Text>
      </View>
    );
  }

  const ytId = extractYouTubeId(streamUrl);
  const isDirectVideo = streamUrl && streamUrl.startsWith('http') && streamUrl !== 'studio';
  const isEnded = status === 'ended';

  // 2. Ended State without a replay video
  if (isEnded && !ytId && !isDirectVideo) {
    return (
      <View style={styles.placeholderContainer}>
        <VideoOff size={36} color={colors.textMuted} strokeWidth={1.75} />
        <Text style={styles.placeholderTitle}>Class Has Ended</Text>
        <Text style={[styles.placeholderSubtitle, { color: colors.textMuted }]}>
          The live masterclass has concluded. Replay recording will be available once uploaded.
        </Text>
      </View>
    );
  }

  // 3. YouTube Embed (Live or Recorded Replay)
  if (ytId) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; background-color: #000000; }
            html, body { width: 100%; height: 100%; overflow: hidden; background-color: #000000; }
            .iframe-container { position: relative; width: 100%; height: 100%; }
            iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
          </style>
        </head>
        <body>
          <div class="iframe-container">
            <iframe 
              src="https://www.youtube.com/embed/${ytId}?autoplay=1&playsinline=1&controls=1&rel=0&modestbranding=1" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        </body>
      </html>
    `;

    return (
      <View style={styles.container}>
        <SafeWebView
          source={{ html: htmlContent, uri: `https://www.youtube.com/embed/${ytId}` }}
          ytId={ytId}
          title={title}
          style={styles.webview}
        />
        {isEnded && (
          <View style={[styles.replayIndicatorPill, { borderColor: colors.accent }]}>
            <Sparkles size={11} color={colors.accent} strokeWidth={2} />
            <Text style={[styles.replayIndicatorText, { color: colors.accent }]}>RECORDED REPLAY</Text>
          </View>
        )}
      </View>
    );
  }

  // 4. Direct Video URL (Replay via native expo-video, never raw WebView)
  if (isDirectVideo) {
    return (
      <View style={styles.container}>
        <DirectVideoPlayerView url={streamUrl!} />
        {isEnded && (
          <View style={[styles.replayIndicatorPill, { borderColor: colors.accent }]}>
            <Sparkles size={11} color={colors.accent} strokeWidth={2} />
            <Text style={[styles.replayIndicatorText, { color: colors.accent }]}>RECORDED REPLAY</Text>
          </View>
        )}
      </View>
    );
  }

  // 5. Admin Studio Broadcast (Live Camera & Screen Share from Admin Page)
  if (liveFrame) {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: liveFrame }}
          style={styles.liveFrameImage}
          contentFit="contain"
          cachePolicy="none"
          priority="high"
        />
        <View style={styles.liveIndicatorPill}>
          <View style={[styles.liveIndicatorDot, { backgroundColor: colors.error }]} />
          <Text style={styles.liveIndicatorText}>STUDIO LIVE STREAM</Text>
        </View>
      </View>
    );
  }

  // 6. Waiting for instructor feed
  return (
    <View style={styles.placeholderContainer}>
      <Radio size={40} color={colors.error} strokeWidth={1.75} />
      <Text style={styles.placeholderTitle}>Studio Broadcast Active</Text>
      <Text style={[styles.placeholderSubtitle, { color: colors.textMuted }]}>
        Connecting to the instructor's live camera and screen share...
      </Text>
      <ActivityIndicator size="small" color={colors.error} style={{ marginTop: 12 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  liveFrameImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  liveIndicatorPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  replayIndicatorPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  replayIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
