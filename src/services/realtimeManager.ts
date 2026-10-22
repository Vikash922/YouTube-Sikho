import { useState, useEffect } from 'react';
import {
  firebaseFirestore,
  doc,
  onSnapshot,
  collection,
  query,
  limit,
} from './firebase';

export type NetworkStatus = 'online' | 'reconnecting' | 'offline';

/**
 * Shared in-memory active listener cache to prevent duplicate onSnapshot calls.
 */
class RealtimeManager {
  private activeSubscriptions = new Map<string, { count: number; unsubscribe: () => void }>();
  private networkStatus: NetworkStatus = 'online';
  private listeners: Set<(status: NetworkStatus) => void> = new Set();

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
   * Monitor student account block state in real time
   */
  public watchUserAccount(
    uid: string | null | undefined,
    onBlocked: (reason?: string) => void
  ): () => void {
    if (!uid) return () => {};

    const userDocRef = doc(firebaseFirestore, 'users', uid);
    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.isBlocked === true) {
            onBlocked(data?.blockReason || 'Your account has been suspended by administration.');
          }
        }
      },
      (error) => {
        console.warn('[RealtimeManager] watchUserAccount error:', error.message);
      }
    );
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