import { useEffect, useState, useCallback } from 'react';
import { firebaseAuth, onAuthStateChanged, User } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import { getUserProfile } from '../services/userService';

export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { setUser, setProfile } = useAuthStore();
  const { fetchConfig, isMaintenanceMode, isUpdateRequired } = useConfigStore();

  const initialize = useCallback(async () => {
    setConfigError(null);
    let unsubscribeAuth: (() => void) | undefined;

    try {
      await fetchConfig();

      unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (firebaseUser: User | null) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            if (profile) {
              setProfile(profile);
              setIsOffline(false);
            } else {
              // Could not fetch profile or user has no profile document
              setProfile(null);
            }
          } catch (userErr: any) {
            console.warn('[useAppInit] User profile fetch error / offline:', userErr);
            setIsOffline(true);
          }
        } else {
          setProfile(null);
          setIsOffline(false);
        }

        setIsReady(true);
      });
    } catch (error: any) {
      console.error('[useAppInit] Config fetch failure:', error);
      setConfigError(error?.message || 'Failed to load app configuration. Please check your internet connection.');
      setIsReady(false);
    }

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [fetchConfig, setUser, setProfile]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initialize().then((clean) => {
      cleanup = clean;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [initialize]);

  return {
    isReady,
    isMaintenanceMode,
    isUpdateRequired,
    configError,
    isOffline,
    retry: initialize,
  };
}
