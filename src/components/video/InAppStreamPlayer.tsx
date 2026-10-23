import React from 'react';
import { View, StyleSheet, Platform, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Radio, VideoOff, Clock } from 'lucide-react-native';

interface InAppStreamPlayerProps {
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
  streamUrl,
  status,
  title,
  scheduledAt,
}) => {
  // If not live
  if (status === 'ended') {
    return (
      <View style={styles.placeholderContainer}>
        <VideoOff size={36} color="#94A3B8" strokeWidth={1.75} />
        <Text style={styles.placeholderTitle}>Class Has Ended</Text>
        <Text style={styles.placeholderSubtitle}>
          The live interactive session has concluded.
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

  // If running on Web
  if (Platform.OS === 'web') {
    if (ytId) {
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

    if (streamUrl && streamUrl.startsWith('http')) {
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

    return (
      <View style={styles.placeholderContainer}>
        <Radio size={36} color="#EF4444" strokeWidth={1.75} />
        <Text style={styles.placeholderTitle}>Studio Broadcast is Active</Text>
        <Text style={styles.placeholderSubtitle}>
          Instructor is broadcasting live from Admin Studio.
        </Text>
      </View>
    );
  }

  // Native Mobile Player (WebView embedded player)
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

  // Fallback for direct MP4 or other video sources
  if (streamUrl && streamUrl.startsWith('http')) {
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

  // Studio live fallback
  return (
    <View style={styles.placeholderContainer}>
      <Radio size={36} color="#EF4444" strokeWidth={1.75} />
      <Text style={styles.placeholderTitle}>Studio Stream Active</Text>
      <Text style={styles.placeholderSubtitle}>
        The instructor is streaming live from the web broadcast studio.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
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
});
