import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { ensureUserProfile, subscribeToAuth } from '../lib/auth';
import type { GuildUser } from '../types/guild';

interface AuthState {
  firebaseUser: User | null;
  profile: GuildUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ firebaseUser: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GuildUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = subscribeToAuth(async (user) => {
      setFirebaseUser(user);
      unsubscribeProfile?.();

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await ensureUserProfile(user);
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
          if (!snapshot.exists()) {
            // User document deleted or doesn't exist - force re-login
            console.warn('User profile not found, redirecting to login');
            setProfile(null);
          } else {
            setProfile(snapshot.data() as GuildUser);
          }
          setLoading(false);
        }, (err) => {
          // Handle Firestore errors (permission denied, not found, etc.)
          console.error('Profile snapshot error:', err.code, err.message);
          // If document doesn't exist or permission denied, clear profile
          if (err.code === 'not-found' || err.code === 'permission-denied') {
            setProfile(null);
          }
          setLoading(false);
        });
      } catch (err: any) {
        console.error('Auth initialization error:', err?.message || err);
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo(() => ({ firebaseUser, profile, loading }), [firebaseUser, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
