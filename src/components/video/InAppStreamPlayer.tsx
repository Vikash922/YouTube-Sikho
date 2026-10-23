import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { Radio, VideoOff, Clock, Sparkles } from 'lucide-react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseFirestore } from '../../services/firebase';

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

export const InAppStreamPlayer: React.FC<InAppStreamPlayerProps> = ({
  classId,
  streamUrl,
  status,
  title,
  scheduledAt,
}) => {
  const [liveFrame, setLiveFrame] = useState<string | null>(null);

  // Subscribe to live frame for studio broadcasts
  useEffect(() => {
    if (!classId) return;

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
  }, [classId]);

  // If not live
  if (status === 'ended') {
    return (
      <View style={styles.placeholderContainer}>
        <VideoOff size={36} color="#94A3B8" strokeWidth={1.75} />
        <Text style={styles.placeholderTitle}>Class Has Ended</Text>
        <Text style={styles.placeholderSubtitle}>
          The live interactive masterclass has concluded.
        </Text>
      </View>
    );
  }

  if (status === 'scheduled') {
    return (
      <View style={styles.placeholderContainer}>
        <Clock size={36} color="#F59E0B" strokeWidth={1.75} />
        <Text style={styles.placeholderTitle}>Session is Scheduled</Text>
        <Text style={styles.placeholderSubtitle}>
          {scheduledAt
            ? `Starts at: ${new Date(scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            : 'Waiting for instructor to go live...'}
        </Text>
      </View>
    );
  }

  const ytId = extractYouTubeId(streamUrl);

  // 1. YouTube Live Embed (Web & Native)
  if (ytId) {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.container}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </View>
      );
    }

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
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
          style={styles.webview}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#EF4444" />
            </View>
          )}
          startInLoadingState={true}
        />
      </View>
    );
  }

  // 2. Direct MP4 Video URL
  if (streamUrl && streamUrl.startsWith('http') && streamUrl !== 'studio') {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.container}>
          <video
            src={streamUrl}
            autoPlay
            controls
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000000' }}
          />
        </View>
      );
    }

    const videoHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; background: #000; }
            body { display: flex; align-items: center; justify-content: center; height: 100%; background: #000; }
            video { width: 100%; height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <video src="${streamUrl}" autoplay controls playsinline></video>
        </body>
      </html>
    `;

    return (
      <View style={styles.container}>
        <WebView
          originWhitelist={['*']}
          source={{ html: videoHtml }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          style={styles.webview}
        />
      </View>
    );
  }

  // 3. Admin Studio Broadcast (Live Camera & Screen Share from Admin Page)
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
          <View style={styles.liveIndicatorDot} />
          <Text style={styles.liveIndicatorText}>STUDIO LIVE STREAM</Text>
        </View>
      </View>
    );
  }

  // Waiting for instructor feed
  return (
    <View style={styles.placeholderContainer}>
      <Radio size={40} color="#EF4444" strokeWidth={1.75} />
      <Text style={styles.placeholderTitle}>Studio Broadcast Active</Text>
      <Text style={styles.placeholderSubtitle}>
        Connecting to the instructor's live camera and screen share...
      </Text>
      <ActivityIndicator size="small" color="#EF4444" style={{ marginTop: 12 }} />
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
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
    color: '#94A3B8',
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
    backgroundColor: '#EF4444',
  },
  liveIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
