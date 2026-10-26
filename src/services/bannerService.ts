import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firebaseFirestore } from './firebase';

export type HomeSectionType =
  | 'banners'
  | 'liveNow'
  | 'continueWatching'
  | 'categories'
  | 'newCourses'
  | 'featured'
  | 'popular'
  | 'streak'
  | 'live_stream'
  | 'streak_banner'
  | 'featured_courses'
  | 'popular_courses';

export interface Banner {
  id: string;
  title?: string;
  imageUrl: string;
  actionType: 'course' | 'category' | 'url' | 'none';
  actionValue?: string;
  targetType?: 'course' | 'category' | 'url' | 'none';
  targetValue?: string;
  order: number;
  isVisible: boolean;
}

export interface HomeSectionConfig {
  id: string;
  type: HomeSectionType;
  title: string;
  order: number;
  isVisible: boolean;
  config?: Record<string, any>;
}

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { id: 'banners', type: 'banners', title: 'Featured Highlights', order: 1, isVisible: true },
  { id: 'liveNow', type: 'liveNow', title: 'Live Now Streaming', order: 2, isVisible: true },
  { id: 'continueWatching', type: 'continueWatching', title: 'Continue Learning', order: 3, isVisible: true },
  { id: 'categories', type: 'categories', title: 'Explore Top Topics', order: 4, isVisible: true },
  { id: 'featured', type: 'featured', title: 'Featured Masterclasses', order: 5, isVisible: true },
  { id: 'popular', type: 'popular', title: 'Popular Courses', order: 6, isVisible: true },
  { id: 'streak', type: 'streak', title: 'Daily Learning Streak', order: 7, isVisible: true },
];

/**
 * Real-time listener for active promotional banners.
 * Filters by isVisible == true to conform with Firestore security rules.
 */
export function subscribeToBanners(
  onUpdate: (banners: Banner[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'banners');
  const q = query(colRef, where('isVisible', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const data = d.data();
          const actionType = data.actionType || data.targetType || 'none';
          const actionValue = data.actionValue || data.targetValue || '';
          return {
            id: d.id,
            ...data,
            title: data.title || '',
            imageUrl: data.imageUrl || data.image || '',
            actionType,
            actionValue,
            targetType: actionType,
            targetValue: actionValue,
            isVisible: data.isVisible !== false,
            order: data.order || 0,
          } as Banner;
        })
        .filter((b) => !!b.imageUrl);
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
 * Real-time listener for dynamic home sections.
 * Filters by isVisible == true to conform with Firestore security rules.
 */
export function subscribeToHomeSections(
  onUpdate: (sections: HomeSectionConfig[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'homeSections');
  const q = query(colRef, where('isVisible', '==', true));

  return onSnapshot(
    q,
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