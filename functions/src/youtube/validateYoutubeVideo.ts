import { HttpsError } from 'firebase-functions/v2/https';
import { getSecrets } from '../config';

export interface ValidateYoutubeVideoRequest {
  url: string;
}

export interface ValidateYoutubeVideoResponse {
  videoId: string;
  title: string;
  durationSeconds: number;
  privacyStatus: 'unlisted' | 'public' | 'private';
  embeddable: boolean;
  madeForKids: boolean;
  liveBroadcastContent: 'none' | 'live' | 'upcoming';
  thumbnailUrl: string;
}

/**
 * Extracts YouTube video ID from various standard URL formats.
 * Rejects playlists without video ID, channels, and invalid formats.
 */
export function extractYoutubeVideoId(inputUrl: string): string | null {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  const trimmed = inputUrl.trim();

  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Reject standalone playlist or channel URLs
  if (
    trimmed.includes('/channel/') ||
    trimmed.includes('/c/') ||
    trimmed.includes('/user/') ||
    trimmed.includes('/@') ||
    (trimmed.includes('/playlist?') && !trimmed.includes('v='))
  ) {
    return null;
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const hostname = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    // 1. youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0].split('?')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    // 2. youtube.com or youtube-nocookie.com
    if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      // /watch?v=VIDEO_ID
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v');
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      // /embed/VIDEO_ID or /live/VIDEO_ID or /shorts/VIDEO_ID
      const parts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'live', 'shorts', 'v'].includes(parts[0]) && parts[1]) {
        const id = parts[1].split('?')[0];
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    // Malformed URL, try regex fallback
  }

  const match = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match && match[1] ? match[1] : null;
}

/**
 * Parses ISO 8601 duration format (e.g. PT1H15M30S, PT4M20S, PT55S) into integer seconds.
 */
export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Validates a YouTube video URL/ID via YouTube Data API v3.
 */
export async function validateYoutubeVideoHandler(
  data: ValidateYoutubeVideoRequest
): Promise<ValidateYoutubeVideoResponse> {
  if (!data?.url) {
    throw new HttpsError('invalid-argument', 'Please provide a valid YouTube URL or video ID.');
  }

  const videoId = extractYoutubeVideoId(data.url);
  if (!videoId) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid YouTube link format. Playlists, channels, and malformed URLs are not accepted. Please provide a direct video, live, or shorts link.'
    );
  }

  const secrets = getSecrets();
  const apiKey = secrets.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,liveStreamingDetails&id=${videoId}&key=${apiKey}`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `YouTube API responded with HTTP ${res.status}`;
      throw new HttpsError('internal', `YouTube API verification failed: ${errMsg}`);
    }

    const json: any = await res.json();
    if (!json.items || json.items.length === 0) {
      throw new HttpsError('not-found', `No YouTube video found for ID "${videoId}". Verify the video exists and was not deleted.`);
    }

    const item = json.items[0];
    const snippet = item.snippet || {};
    const contentDetails = item.contentDetails || {};
    const status = item.status || {};

    const durationSeconds = parseIsoDuration(contentDetails.duration || 'PT0S');
    const privacyStatus = (status.privacyStatus || 'unlisted') as 'unlisted' | 'public' | 'private';
    const embeddable = status.embeddable !== false;
    const madeForKids = status.madeForKids === true;
    const liveBroadcastContent = (snippet.liveBroadcastContent || 'none') as 'none' | 'live' | 'upcoming';
    const thumbnailUrl =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return {
      videoId,
      title: snippet.title || 'Untitled YouTube Video',
      durationSeconds,
      privacyStatus,
      embeddable,
      madeForKids,
      liveBroadcastContent,
      thumbnailUrl,
    };
  }

  // Fallback when YOUTUBE_API_KEY is not yet deployed: query official oEmbed endpoint
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembedData: any = await oembedRes.json();
      return {
        videoId,
        title: oembedData.title || 'YouTube Video',
        durationSeconds: 0,
        privacyStatus: 'unlisted',
        embeddable: true,
        madeForKids: false,
        liveBroadcastContent: 'none',
        thumbnailUrl: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  } catch {
    // If oEmbed fails
  }

  return {
    videoId,
    title: `YouTube Video (${videoId})`,
    durationSeconds: 0,
    privacyStatus: 'unlisted',
    embeddable: true,
    madeForKids: false,
    liveBroadcastContent: 'none',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}
