/**
 * Robust image URL resolver for Admin panel
 * Converts Google Photos, Google Drive, Dropbox, and Imgur links into direct image URLs.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  if (clean.startsWith('data:image/')) return clean;

  const driveFileMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  const driveIdMatch = clean.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  if (clean.includes('googleusercontent.com') && !clean.includes('=')) {
    return `${clean}=s1600`;
  }

  if (clean.includes('dropbox.com')) {
    return clean.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
  }

  const imgurMatch = clean.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurMatch && imgurMatch[1]) {
    return `https://i.imgur.com/${imgurMatch[1]}.png`;
  }

  return clean;
}
