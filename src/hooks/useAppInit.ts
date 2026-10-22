import { useEffect, useState } from 'react';
import { firebaseAuth, onAuthStateChanged, User } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import { getUserProfile } from '../services/userService';

export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const { setUser, setProfile } = useAuthStore();
  const { fetchConfig, isMaintenanceMode, isUpdateRequired } = useConfigStore();

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    async function initialize() {
      try {
        await fetchConfig();

        unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (firebaseUser: User | null) => {
          setUser(firebaseUser);

          if (firebaseUser) {
            try {
              const profile = await getUserProfile(firebaseUser.uid);
              setProfile(profile);
            } catch (userErr) {
              console.warn('[useAppInit] User setup warning:', userErr);
            }
          } else {
            setProfile(null);
          }

          setIsReady(true);
        });
      } catch (error) {
        console.error('[useAppInit] Critical init failure:', error);
        setIsReady(true);
      }
    }

    initialize();

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  return {
    isReady,
    isMaintenanceMode,
    isUpdateRequired,
  };
}
