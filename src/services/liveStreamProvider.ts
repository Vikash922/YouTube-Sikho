export type StreamProviderType = 'youtube' | '100ms' | 'zegocloud';

export interface LiveClassData {
  id: string;
  title: string;
  courseId: string; // or 'free_for_all'
  courseTitle?: string;
  instructorName?: string;
  scheduledAt: any;
  status: 'scheduled' | 'live' | 'ended';
  streamUrl: string;
  streamProvider: StreamProviderType;
  chatEnabled: boolean;
  viewerCount?: number;
  recordingUrl?: string;
  description?: string;
}

export interface LiveStreamProvider {
  type: StreamProviderType;
  getEmbedUrl(streamUrl: string): string;
  extractVideoId(streamUrl: string): string;
}

/**
 * YouTube Live Provider (Unlisted or Public YouTube streams)
 */
export class YouTubeLiveProvider implements LiveStreamProvider {
  type: StreamProviderType = 'youtube';

  extractVideoId(url: string): string {
    if (!url) return '';
    // Support youtube.com/watch?v=..., youtu.be/..., youtube.com/live/...
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : url;
  }

  getEmbedUrl(streamUrl: string): string {
    const videoId = this.extractVideoId(streamUrl);
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0`;
  }
}

/**
 * 100ms Provider Stub (Ready for future plug-and-play expansion without rewriting screens)
 */
export class HundredMsProvider implements LiveStreamProvider {
  type: StreamProviderType = '100ms';

  extractVideoId(url: string): string {
    return url;
  }

  getEmbedUrl(streamUrl: string): string {
    return streamUrl;
  }
}

/**
 * ZegoCloud Provider Stub (Ready for future plug-and-play expansion)
 */
export class ZegoCloudProvider implements LiveStreamProvider {
  type: StreamProviderType = 'zegocloud';

  extractVideoId(url: string): string {
    return url;
  }

  getEmbedUrl(streamUrl: string): string {
    return streamUrl;
  }
}

export function getLiveStreamProvider(type: StreamProviderType = 'youtube'): LiveStreamProvider {
  switch (type) {
    case '100ms':
      return new HundredMsProvider();
    case 'zegocloud':
      return new ZegoCloudProvider();
    case 'youtube':
    default:
      return new YouTubeLiveProvider();
  }
}
