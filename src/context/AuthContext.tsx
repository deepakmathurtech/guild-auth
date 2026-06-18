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
          setProfile(snapshot.exists() ? (snapshot.data() as GuildUser) : null);
          setLoading(false);
        }, (err) => {
          console.error('Profile snapshot error:', err);
          setLoading(false);
        });
      } catch (err) {
        console.error('Auth initialization error:', err);
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
