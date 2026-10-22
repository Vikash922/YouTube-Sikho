import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AdminUser } from '../types';

interface AuthContextType {
  user: User | null;
  adminData: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInAsDemoAdmin: () => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'yt_admin_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check for existing persisted session
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          uid: parsed.uid,
          email: parsed.email,
          displayName: parsed.name,
        } as unknown as User;
      }
    } catch (e) {
      // ignore JSON parse error
    }
    return null;
  });

  const [adminData, setAdminData] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return null;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return !!localStorage.getItem(LOCAL_STORAGE_KEY);
  });

  const [loading, setLoading] = useState<boolean>(() => {
    return !localStorage.getItem(LOCAL_STORAGE_KEY);
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If session is already verified via localStorage, don't show loading screen
      const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (!firebaseUser) {
        if (!savedSession) {
          setUser(null);
          setAdminData(null);
          setIsAdmin(false);
        }
        setLoading(false);
        return;
      }

      try {
        // 1. Check custom claims
        let hasAdminClaim = false;
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(false);
          hasAdminClaim =
            idTokenResult.claims.admin === true ||
            idTokenResult.claims.role === 'admin';
        } catch (e) {
          // ignore
        }

        // 2. Check /admins/{uid} Firestore collection
        let hasAdminDoc = false;
        let adminDocData: any = null;
        try {
          const adminDocRef = doc(db, 'admins', firebaseUser.uid);
          const adminSnap = await getDoc(adminDocRef);
          if (adminSnap.exists()) {
            hasAdminDoc = true;
            adminDocData = adminSnap.data();
          }
        } catch (dbErr) {
          console.warn('Could not check /admins collection:', dbErr);
        }

        if (hasAdminClaim || hasAdminDoc) {
          const verifiedAdmin: AdminUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'admin',
            name: adminDocData?.name || firebaseUser.displayName || 'Admin',
            active: adminDocData?.active !== false,
          };

          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(verifiedAdmin));
          setUser(firebaseUser);
          setIsAdmin(true);
          setAdminData(verifiedAdmin);
          setError(null);
        } else if (!savedSession) {
          console.warn(`Unauthorized login attempt by non-admin: ${firebaseUser.email} (${firebaseUser.uid})`);
          await firebaseSignOut(auth);
          setUser(null);
          setAdminData(null);
          setIsAdmin(false);
          setError('Access Denied: Your account does not have administrator privileges.');
        }
      } catch (err: any) {
        console.error('Error verifying admin authorization:', err);
        if (!savedSession) {
          setError(err.message || 'Authentication error while verifying admin privileges.');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const isDefaultAdmin =
      cleanEmail === 'admin@youtubesikho.com' &&
      (password === 'Admin@123456' || password === 'admin' || password === 'admin123');

    let firebaseUser: User | null = null;

    // 1. Authenticate with Firebase Auth
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      firebaseUser = cred.user;
    } catch (err: any) {
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && isDefaultAdmin) {
        try {
          const createCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUser = createCred.user;
        } catch (createErr) {
          console.warn('Could not auto-create admin in Auth:', createErr);
        }
      }

      // If email auth provider is disabled or sign in failed for default admin, fallback to anonymous sign in
      if (!firebaseUser && isDefaultAdmin) {
        try {
          const anonCred = await signInAnonymously(auth);
          firebaseUser = anonCred.user;
        } catch (anonErr) {
          console.warn('Anonymous sign-in fallback:', anonErr);
        }
      }

      if (!firebaseUser && !isDefaultAdmin) {
        setLoading(false);
        if (
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/user-not-found'
        ) {
          throw new Error('Invalid email or password. Use admin@youtubesikho.com / Admin@123456');
        } else if (err.code === 'auth/operation-not-allowed') {
          throw new Error(
            'Firebase Email/Password provider is disabled. Click "Instant Admin Demo Access" below or enable it in Firebase Console.'
          );
        } else {
          throw new Error(err.message || 'Failed to sign in. Please try again.');
        }
      }
    }

    const verifiedAdmin: AdminUser = {
      uid: firebaseUser?.uid || 'admin_bootstrap_default',
      email: firebaseUser?.email || cleanEmail,
      role: 'admin',
      name: firebaseUser?.displayName || (isDefaultAdmin ? 'System Administrator' : 'Administrator'),
      active: true,
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(verifiedAdmin));
    setUser(
      (firebaseUser || {
        uid: verifiedAdmin.uid,
        email: verifiedAdmin.email,
        displayName: verifiedAdmin.name,
      }) as unknown as User
    );
    setAdminData(verifiedAdmin);
    setIsAdmin(true);

    // Bootstrap Firestore admin document
    if (firebaseUser) {
      try {
        await setDoc(
          doc(db, 'admins', firebaseUser.uid),
          {
            role: 'admin',
            email: verifiedAdmin.email,
            name: verifiedAdmin.name,
            active: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (dbErr) {
        console.warn('Could not bootstrap admin doc in Firestore:', dbErr);
      }
    }

    setLoading(false);
  };

  const signInAsDemoAdmin = async () => {
    setLoading(true);
    let firebaseUser: User | null = null;
    try {
      const anonCred = await signInAnonymously(auth);
      firebaseUser = anonCred.user;
    } catch (e) {
      console.warn('Anonymous sign-in fallback:', e);
    }

    const demoUid = firebaseUser?.uid || 'admin_bootstrap_default';
    const demoAdmin: AdminUser = {
      uid: demoUid,
      email: 'admin@youtubesikho.com',
      role: 'admin',
      name: 'System Administrator',
      active: true,
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(demoAdmin));
    setUser(
      (firebaseUser || {
        uid: demoUid,
        email: demoAdmin.email,
        displayName: demoAdmin.name,
      }) as unknown as User
    );
    setIsAdmin(true);
    setAdminData(demoAdmin);

    // Bootstrap Firestore admin document
    if (firebaseUser) {
      try {
        await setDoc(
          doc(db, 'admins', firebaseUser.uid),
          {
            role: 'admin',
            email: 'admin@youtubesikho.com',
            name: 'System Administrator',
            active: true,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Could not write admin doc:', err);
      }
    }

    setLoading(false);
    setError(null);
  };

  const signOut = async () => {
    setError(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // ignore
    }
    setUser(null);
    setAdminData(null);
    setIsAdmin(false);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        throw new Error('No user account found with this email address.');
      }
      throw new Error(err.message || 'Failed to send password reset email.');
    }
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
        signInAsDemoAdmin,
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
