import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  firebaseFirestore,
  firebaseAuth,
  doc,
  onSnapshot,
} from './firebase';
import type {
  DocumentSnapshot,
  Query,
  QuerySnapshot,
} from 'firebase/firestore';

export type NetworkStatus = 'online' | 'reconnecting' | 'offline';

interface CachedDocListener {
  refCount: number;
  callbacks: Set<(snap: DocumentSnapshot) => void>;
  errorCallbacks: Set<(error: any) => void>;
  unsubscribe: () => void;
  lastSnapshot?: DocumentSnapshot;
}

interface CachedQueryListener {
  refCount: number;
  callbacks: Set<(snap: QuerySnapshot) => void>;
  errorCallbacks: Set<(error: any) => void>;
  unsubscribe: () => void;
  lastSnapshot?: QuerySnapshot;
}

/**
 * Shared in-memory active listener cache to prevent duplicate onSnapshot calls.
 * Implements ref-counted subscription sharing and network connectivity monitoring.
 */
class RealtimeManager {
  private docCache = new Map<string, CachedDocListener>();
  private queryCache = new Map<string, CachedQueryListener>();
  private networkStatus: NetworkStatus = 'online';
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private netInfoUnsubscribe?: () => void;

  constructor() {
    this.initNetworkMonitoring();
  }

  private initNetworkMonitoring() {
    try {
      this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
        if (!state.isConnected) {
          this.setStatus('offline');
        } else if (state.isInternetReachable === false) {
          this.setStatus('reconnecting');
        } else {
          this.setStatus('online');
        }
      });
    } catch (err) {
      console.warn('[RealtimeManager] NetInfo listener failed to attach:', err);
    }
  }

  public getStatus(): NetworkStatus {
    return this.networkStatus;
  }

  public setStatus(status: NetworkStatus) {
    if (this.networkStatus !== status) {
      this.networkStatus = status;
      this.listeners.forEach((l) => l(status));
    }
  }

  public subscribeStatus(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.networkStatus);
    return () => this.listeners.delete(listener);
  }

  /**
   * Ref-counted shared document listener.
   * If 5 components listen to /users/123, only 1 Firestore onSnapshot connection is open.
   */
  public subscribeDocument(
    docPath: string,
    onData: (snapshot: DocumentSnapshot) => void,
    onError?: (error: any) => void
  ): () => void {
    let entry = this.docCache.get(docPath);

    if (!entry) {
      const callbacks = new Set<(snap: DocumentSnapshot) => void>();
      const errorCallbacks = new Set<(error: any) => void>();

      callbacks.add(onData);
      if (onError) errorCallbacks.add(onError);

      const docRef = doc(firebaseFirestore, docPath);
      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          const currentEntry = this.docCache.get(docPath);
          if (currentEntry) {
            currentEntry.lastSnapshot = snap;
            currentEntry.callbacks.forEach((cb) => {
              try {
                cb(snap);
              } catch (e) {
                console.warn('[RealtimeManager] Doc callback error:', e);
              }
            });
          }
        },
        (error) => {
          this.setStatus('reconnecting');
          const currentEntry = this.docCache.get(docPath);
          if (currentEntry) {
            currentEntry.errorCallbacks.forEach((cb) => {
              try {
                cb(error);
              } catch (e) {
                console.warn('[RealtimeManager] Doc error callback error:', e);
              }
            });
          }
        }
      );

      entry = {
        refCount: 1,
        callbacks,
        errorCallbacks,
        unsubscribe,
      };
      this.docCache.set(docPath, entry);
    } else {
      entry.refCount++;
      entry.callbacks.add(onData);
      if (onError) entry.errorCallbacks.add(onError);
      // Immediately provide cached snapshot if available
      if (entry.lastSnapshot) {
        onData(entry.lastSnapshot);
      }
    }

    return () => {
      const current = this.docCache.get(docPath);
      if (!current) return;
      current.callbacks.delete(onData);
      if (onError) current.errorCallbacks.delete(onError);
      current.refCount--;

      if (current.refCount <= 0) {
        current.unsubscribe();
        this.docCache.delete(docPath);
      }
    };
  }

  /**
   * Ref-counted shared query listener.
   */
  public subscribeQuery(
    cacheKey: string,
    queryRef: Query,
    onData: (snapshot: QuerySnapshot) => void,
    onError?: (error: any) => void
  ): () => void {
    let entry = this.queryCache.get(cacheKey);

    if (!entry) {
      const callbacks = new Set<(snap: QuerySnapshot) => void>();
      const errorCallbacks = new Set<(error: any) => void>();

      callbacks.add(onData);
      if (onError) errorCallbacks.add(onError);

      const unsubscribe = onSnapshot(
        queryRef as any,
        (snap: any) => {
          const currentEntry = this.queryCache.get(cacheKey);
          if (currentEntry) {
            currentEntry.lastSnapshot = snap as QuerySnapshot;
            currentEntry.callbacks.forEach((cb) => {
              try {
                cb(snap as QuerySnapshot);
              } catch (e) {
                console.warn('[RealtimeManager] Query callback error:', e);
              }
            });
          }
        },
        (error: any) => {
          this.setStatus('reconnecting');
          const currentEntry = this.queryCache.get(cacheKey);
          if (currentEntry) {
            currentEntry.errorCallbacks.forEach((cb) => {
              try {
                cb(error);
              } catch (e) {
                console.warn('[RealtimeManager] Query error callback error:', e);
              }
            });
          }
        }
      );

      entry = {
        refCount: 1,
        callbacks,
        errorCallbacks,
        unsubscribe,
      };
      this.queryCache.set(cacheKey, entry);
    } else {
      entry.refCount++;
      entry.callbacks.add(onData);
      if (onError) entry.errorCallbacks.add(onError);
      if (entry.lastSnapshot) {
        onData(entry.lastSnapshot);
      }
    }

    return () => {
      const current = this.queryCache.get(cacheKey);
      if (!current) return;
      current.callbacks.delete(onData);
      if (onError) current.errorCallbacks.delete(onError);
      current.refCount--;

      if (current.refCount <= 0) {
        current.unsubscribe();
        this.queryCache.delete(cacheKey);
      }
    };
  }

  /**
   * Monitor student account block state in real time
   */
  public watchUserAccount(
    uid: string | null | undefined,
    onBlocked: (reason?: string) => void
  ): () => void {
    if (!uid || !firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== uid) {
      return () => {};
    }

    return this.subscribeDocument(`users/${uid}`, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.isBlocked === true) {
          onBlocked(data?.blockReason || 'Your account has been suspended by administration.');
        }
      }
    });
  }
}

export const realtimeManager = new RealtimeManager();

/**
 * React Hook to read live network/reconnecting state
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<NetworkStatus>(realtimeManager.getStatus());

  useEffect(() => {
    return realtimeManager.subscribeStatus(setStatus);
  }, []);

  return status;
}
