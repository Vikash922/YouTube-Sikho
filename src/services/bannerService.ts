import { collection, onSnapshot } from 'firebase/firestore';
import { firebaseFirestore } from './firebase';

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  targetType: 'course' | 'url' | 'none';
  targetValue?: string;
  order: number;
  isVisible: boolean;
}

export interface HomeSectionConfig {
  id: string;
  type: 'live_stream' | 'streak_banner' | 'featured_courses' | 'popular_courses';
  title: string;
  order: number;
  isVisible: boolean;
}

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { id: 'sec_live', type: 'live_stream', title: 'Live Now Streaming', order: 1, isVisible: true },
  { id: 'sec_streak', type: 'streak_banner', title: 'Daily Learning Streak', order: 2, isVisible: true },
  { id: 'sec_featured', type: 'featured_courses', title: 'Featured Masterclasses', order: 3, isVisible: true },
  { id: 'sec_popular', type: 'popular_courses', title: 'Popular Courses', order: 4, isVisible: true },
];

/**
 * Real-time listener for active promotional banners
 */
export function subscribeToBanners(
  onUpdate: (banners: Banner[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'banners');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Banner))
        .filter((b) => b.isVisible !== false && b.imageUrl);
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('[bannerService] subscribeToBanners error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for dynamic home sections
 */
export function subscribeToHomeSections(
  onUpdate: (sections: HomeSectionConfig[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'homeSections');

  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_HOME_SECTIONS);
        return;
      }
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as HomeSectionConfig)
      );
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('[bannerService] subscribeToHomeSections error:', err.message);
      onUpdate(DEFAULT_HOME_SECTIONS);
      if (onError) onError(err);
    }
  );
}