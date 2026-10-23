import React from 'react';
import { View, Platform, Linking, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Play, ExternalLink } from 'lucide-react-native';

interface SafeWebViewProps {
  source: { html?: string; uri?: string };
  style?: any;
  ytId?: string | null;
  title?: string;
  onPressFallback?: () => void;
}

let cachedWebView: any = undefined;

function getNativeWebView() {
  if (cachedWebView !== undefined) return cachedWebView;
  try {
    const { NativeModules, TurboModuleRegistry } = require('react-native');
    const hasTurbo =
      TurboModuleRegistry &&
      typeof TurboModuleRegistry.get === 'function' &&
      TurboModuleRegistry.get('RNCWebViewModule');
    const hasNative =
      NativeModules &&
      (NativeModules.RNCWebView || NativeModules.RNCWebViewModule);

    if (hasTurbo || hasNative) {
      cachedWebView = require('react-native-webview').WebView;
      return cachedWebView;
    }
  } catch (err) {
    // Native WebView module not present in this client binary
  }
  cachedWebView = null;
  return null;
}

export const SafeWebView: React.FC<SafeWebViewProps> = ({
  source,
  style,
  ytId,
  title,
  onPressFallback,
}) => {
  // 1. Web Platform: Standard iframe
  if (Platform.OS === 'web') {
    if (source.uri) {
      return (
        <iframe
          src={source.uri}
          style={{ width: '100%', height: '100%', border: 'none', ...style }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (source.html) {
      return (
        <iframe
          srcDoc={source.html}
          style={{ width: '100%', height: '100%', border: 'none', ...style }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  // 2. Native Platform with linked RNCWebView
  const NativeWebViewComponent = getNativeWebView();
  if (NativeWebViewComponent) {
    return (
      <NativeWebViewComponent
        originWhitelist={['*']}
        source={source}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        style={style}
      />
    );
  }

  // 3. Fallback when RNCWebViewModule is not in native binary:
  // Render high-res YouTube preview card with tap-to-play
  const handleOpen = () => {
    if (onPressFallback) {
      onPressFallback();
      return;
    }
    if (ytId) {
      const appUrl = `vnd.youtube://${ytId}`;
      const webUrl = `https://www.youtube.com/watch?v=${ytId}`;
      Linking.canOpenURL(appUrl)
        .then((supported) => {
          if (supported) return Linking.openURL(appUrl);
          return Linking.openURL(webUrl);
        })
        .catch(() => Linking.openURL(webUrl));
    } else if (source.uri) {
      Linking.openURL(source.uri);
    }
  };

  const thumbUrl = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleOpen}
      style={[styles.fallbackContainer, style]}
    >
      {thumbUrl ? (
        <Image
          source={{ uri: thumbUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : null}
      <View style={styles.overlay}>
        <View style={styles.playButton}>
          <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <Text style={styles.playText} numberOfLines={1}>
          {title ? `Play: ${title}` : 'Watch Video'}
        </Text>
        <View style={styles.openBadge}>
          <ExternalLink size={12} color="#FFFFFF" />
          <Text style={styles.openBadgeText}>Open YouTube Player</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  playText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  openBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
