import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firebaseFirestore } from './firebase';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order?: number;
}

/**
 * Real-time listener for categories
 */
export function subscribeToCategories(
  onUpdate: (categories: Category[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'categories');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Category)
      );
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('[categoryService] Realtime categories error:', err.message);
      if (onError) onError(err);
    }
  );
}