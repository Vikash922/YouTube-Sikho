/**
 * Robust image URL resolver that converts Google Photos, Google Drive,
 * Dropbox, and Imgur sharing links into direct image URLs.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  // Return data URIs directly
  if (clean.startsWith('data:image/')) return clean;

  // Google Drive format 1: https://drive.google.com/file/d/ID/view...
  const driveFileMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  // Google Drive format 2: https://drive.google.com/open?id=ID or uc?id=ID
  const driveIdMatch = clean.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  // Google Photos direct / lh3 CDN links without size param -> request high quality
  if (clean.includes('googleusercontent.com') && !clean.includes('=')) {
    return `${clean}=s1600`;
  }

  // Dropbox links: replace ?dl=0 with ?raw=1
  if (clean.includes('dropbox.com')) {
    return clean.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
  }

  // Imgur page links: imgur.com/abc -> i.imgur.com/abc.png
  const imgurMatch = clean.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurMatch && imgurMatch[1]) {
    return `https://i.imgur.com/${imgurMatch[1]}.png`;
  }

  return clean;
}
