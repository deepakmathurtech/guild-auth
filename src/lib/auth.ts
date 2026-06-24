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
import { findBranchByJurisdiction } from '../services/branchService';
import type { GuildRole, GuildUser, Jurisdiction } from '../types/guild';
import { FounderBootstrapService } from '../services/founderBootstrapService';

function nowIso() {
  return new Date().toISOString();
}

export async function ensureUserProfile(user: User, jurisdiction?: Jurisdiction) {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  // Check if founder email - needs bootstrap
  const isFounder = user.email?.toLowerCase() === 'thecentralguild@gmail.com';

  if (snapshot.exists()) {
    const existingProfile = snapshot.data() as GuildUser;

    // Founder exists - verify role is correct
    if (isFounder && existingProfile.role !== 'founder') {
      await FounderBootstrapService.bootstrap(
        user.uid,
        user.email || '',
        user.displayName || 'Guild Founder'
      );
    }

    return existingProfile;
  }

  // New user - create profile
  const isFounderEmail = user.email?.toLowerCase() === 'thecentralguild@gmail.com';

  // For founder - run full bootstrap
  if (isFounderEmail) {
    const bootstrapResult = await FounderBootstrapService.bootstrap(
      user.uid,
      user.email || '',
      user.displayName || 'Guild Founder'
    );

    if (!bootstrapResult.success) {
      console.error('Founder bootstrap failed:', bootstrapResult.message);
    }

    // Return the bootstrapped founder profile
    return {
      uid: user.uid,
      email: user.email || '',
      fullName: user.displayName || 'Guild Founder',
      role: 'founder',
      status: 'active',
      verificationStatus: 'verified',
      guildRank: 'S' as any,
      reputationScore: 0,
      experiencePoints: 0,
      knowledgeEntriesCount: 0,
      completedQuests: 0,
      verifiedOutcomes: 0,
      revenueEarned: 0,
      activityHistory: ['Founder Account Created'] as any,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archiveStatus: 'active',
      jurisdiction: {
        countryId: 'IN',
        countryName: 'India',
        stateId: 'NAT',
        stateName: 'National',
        cityId: 'HQ',
        cityName: 'Headquarters'
      }
    } as GuildUser;
  }

  // Regular user profile
  const profile: Omit<GuildUser, 'jurisdiction'> & { jurisdiction?: Jurisdiction } = {
    uid: user.uid,
    email: user.email || '',
    fullName: user.displayName || user.email?.split('@')[0] || 'Guild Applicant',
    photoURL: user.photoURL ?? '',
    role: 'applicant',
    status: 'active',
    city: jurisdiction?.cityName || '',
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
    archiveStatus: 'active',
    jurisdiction: jurisdiction || {
      countryId: 'india',
      countryName: 'India',
      stateId: 'punjab',
      stateName: 'Punjab',
      cityId: 'ludhiana',
      cityName: 'Ludhiana',
      branchId: 'ludhiana-hq',
      branchName: 'The Guild - Ludhiana'
    }
  };

  await setDoc(userRef, { ...profile, createdAtServer: serverTimestamp() });
  return profile as GuildUser;
}

export async function registerWithEmail(
  email: string, 
  password: string, 
  fullName: string, 
  jurisdiction: Jurisdiction,
  skills: string[],
  interests: string[],
  additional: {
    phone?: string,
    availability?: string,
    emergencyContact?: string,
    preferredRole?: string,
    referralSource?: string,
    branchId?: string,
    branchName?: string
  } = {}
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const userRef = doc(db, 'users', credential.user.uid);

  // Auto-link to branch based on jurisdiction
  const branch = await findBranchByJurisdiction(jurisdiction);

  const profile: GuildUser = {
    uid: credential.user.uid,
    email: email,
    fullName,
    role: email === 'thecentralguild@gmail.com' ? 'founder' : 'applicant',
    status: 'active',
    jurisdiction,
    branchId: additional.branchId || branch?.id,
    branchName: additional.branchName || branch?.name,
    skills,
    interests,
    phone: additional.phone,
    availability: additional.availability,
    emergencyContact: additional.emergencyContact,
    preferredRole: additional.preferredRole,
    referralSource: additional.referralSource,
    verificationStatus: 'pending',
    guildRank: 'Applicant',
    reputationScore: 0,
    experiencePoints: 0,
    knowledgeEntriesCount: 0,
    completedQuests: 0,
    verifiedOutcomes: 0,
    revenueEarned: 0,
    activityHistory: ['Account Registered'],
    createdBy: credential.user.uid,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archiveStatus: 'active'
  };

  await setDoc(userRef, { ...profile, createdAtServer: serverTimestamp() });
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
