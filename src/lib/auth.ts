import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { GuildRole, GuildUser } from '../types/guild';

function nowIso() {
  return new Date().toISOString();
}

export async function ensureUserProfile(user: User, fallbackRole: GuildRole = 'member') {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) return snapshot.data() as GuildUser;

  const profile: GuildUser = {
    uid: user.uid,
    email: user.email || '',
    fullName: user.displayName || user.email?.split('@')[0] || 'Guild Member',
    photoURL: user.photoURL ?? '',
    role: fallbackRole,
    city: '',
    contactInformation: '',
    skills: [],
    interests: [],
    bio: '',
    verificationStatus: 'pending',
    guildRank: 'Applicant',
    reputationScore: 0,
    experiencePoints: 0,
    knowledgeEntriesCount: 0,
    completedQuests: 0,
    verifiedOutcomes: 0,
    revenueEarned: 0,
    activityHistory: [],
    createdBy: user.uid,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archiveStatus: 'active'
  };

  await setDoc(userRef, { ...profile, createdAtServer: serverTimestamp() });
  return profile;
}

export async function registerWithEmail(email: string, password: string, fullName: string, role: GuildRole = 'member') {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfile(credential.user, role);
  await setDoc(doc(db, 'users', credential.user.uid), { ...profile, fullName, role, updatedAt: nowIso() }, { merge: true });
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function reauthenticateForSensitiveAction() {
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in first.');
  const providerId = current.providerData[0]?.providerId;
  if (providerId === GoogleAuthProvider.PROVIDER_ID) return reauthenticateWithPopup(current, googleProvider);
  throw new Error(`Reauthentication for ${providerId || EmailAuthProvider.PROVIDER_ID} is not implemented yet.`);
}
