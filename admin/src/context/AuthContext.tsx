import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import { AdminUser } from '../types';

interface AuthContextType {
  user: User | null;
  adminData: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 30-Minute Idle Session Timeout
  useEffect(() => {
    if (!user) return;

    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        console.warn('[Session] Admin signed out after 30 minutes of inactivity');
        await firebaseSignOut(auth);
        setUser(null);
        setAdminData(null);
        setIsAdmin(false);
        setError('Your session has expired due to 30 minutes of inactivity. Please sign in again.');
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [user]);

  // Helper to verify ID token custom claim admin === true
  const verifyAdminToken = async (firebaseUser: User): Promise<boolean> => {
    try {
      // Force refresh the token to obtain fresh claims from Firebase Auth
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const hasClaim = tokenResult.claims.admin === true || tokenResult.claims.role === 'owner';
      return !!hasClaim;
    } catch (err) {
      console.error('Failed to verify ID token custom claims:', err);
      return false;
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAdminData(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const isAuthorized = await verifyAdminToken(firebaseUser);

      if (isAuthorized) {
        setUser(firebaseUser);
        setIsAdmin(true);
        setAdminData({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: 'admin',
          name: firebaseUser.displayName || 'Administrator',
          active: true,
        });
        setError(null);
      } else {
        console.warn(`Unauthorized login attempt by non-admin: ${firebaseUser.email} (${firebaseUser.uid})`);
        await firebaseSignOut(auth);
        setUser(null);
        setAdminData(null);
        setIsAdmin(false);
        setError('Access Denied: Your account does not have administrator privileges.');
      }
      setLoading(false);
    });

    // Listen for ID token refresh / claim revocation
    const unsubscribeToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;
      const isAuthorized = await verifyAdminToken(firebaseUser);
      if (!isAuthorized) {
        console.warn('Admin custom claim revoked or expired. Signing out.');
        await firebaseSignOut(auth);
        setUser(null);
        setAdminData(null);
        setIsAdmin(false);
        setError('Session expired or administrative privileges revoked.');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Authenticate strictly with Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const firebaseUser = cred.user;

      // 2. Validate custom claims directly from the ID token
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const isAuthorized = tokenResult.claims.admin === true || tokenResult.claims.role === 'owner';

      if (!isAuthorized) {
        // Sign out immediately if not authorized
        await firebaseSignOut(auth);
        throw new Error('Access Denied: Your account does not have administrator privileges.');
      }

      setUser(firebaseUser);
      setIsAdmin(true);
      setAdminData({
        uid: firebaseUser.uid,
        email: firebaseUser.email || cleanEmail,
        role: 'admin',
        name: firebaseUser.displayName || 'Administrator',
        active: true,
      });
    } catch (err: any) {
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        throw new Error('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      } else {
        throw new Error(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setAdminData(null);
      setIsAdmin(false);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        adminData,
        isAdmin,
        loading,
        error,
        signIn,
        signOut,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
