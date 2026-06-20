import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GuildUser, GuildRole } from '../types/guild';

// FOUNDER EMAIL - The single point of truth for federation initialization
const FOUNDER_EMAIL = 'thecentralguild@gmail.com';

/**
 * FounderBootstrapService
 *
 * Handles first-time initialization of the Guild Federation.
 * When the founder logs in for the first time, automatically:
 * 1. Create/verify Founder profile
 * 2. Create Federation root (guildRegions)
 * 3. Create Central Guild (centralGuildMaster role)
 * 4. Seed default state/city structure for India
 */
export const FounderBootstrapService = {
  /**
   * Check if the founder has already been bootstrapped
   */
  async isBootstrapComplete(): Promise<boolean> {
    try {
      // Check if any founder-level user exists
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['founder', 'guildFounder'])
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (err) {
      console.error('Bootstrap check failed:', err);
      return false;
    }
  },

  /**
   * Check if a specific email belongs to the founder
   */
  isFounderEmail(email: string): boolean {
    return email.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
  },

  /**
   * Perform full federation bootstrap
   * Called when founder logs in for the first time
   */
  async bootstrap(userId: string, email: string, fullName: string): Promise<{
  success: boolean;
  role: GuildRole;
  message: string;
}> {
    // Only allow bootstrap from the founder email
    if (!this.isFounderEmail(email)) {
      return { success: false, role: 'applicant', message: 'Unauthorized bootstrap attempt' };
    }

    try {
      // Phase 1: Check if already bootstrapped
      const alreadyBootstrapped = await this.isBootstrapComplete();
      if (alreadyBootstrapped) {
        return { success: true, role: 'founder', message: 'Federation already initialized' };
      }

      // Phase 2: Create Founder Profile
      const founderProfile = await this.createFounderProfile(userId, email, fullName);
      if (!founderProfile) {
        return { success: false, role: 'applicant', message: 'Failed to create founder profile' };
      }

      // Phase 3: Create Federation Root Structure
      await this.createFederationRoot();

      // Phase 4: Create India as default region/state/city
      await this.seedDefaultJurisdiction();

      return {
        success: true,
        role: 'founder',
        message: 'Federation bootstrapped successfully'
      };
    } catch (err: any) {
      console.error('Bootstrap failed:', err);
      return { success: false, role: 'applicant', message: err.message };
    }
  },

  /**
   * Create the founder user profile
   */
  async createFounderProfile(
    userId: string,
    email: string,
    fullName: string
  ): Promise<GuildUser | null> {
    const founder: GuildUser = {
      uid: userId,
      email: email.toLowerCase(),
      fullName: fullName || 'Guild Founder',
      role: 'founder',
      status: 'active',
      verificationStatus: 'verified',
      guildRank: 'S',
      reputationScore: 0,
      experiencePoints: 0,
      knowledgeEntriesCount: 0,
      completedQuests: 0,
      verifiedOutcomes: 0,
      revenueEarned: 0,
      activityHistory: ['Founder Account Created'],
      createdBy: userId,
      skills: ['leadership', 'governance', 'strategy'],
      interests: ['human potential', 'decentralized growth', 'career development'],
      jurisdiction: {
        countryId: 'IN',
        countryName: 'India',
        stateId: 'NAT',
        stateName: 'National',
        cityId: 'HQ',
        cityName: 'Headquarters'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archiveStatus: 'active'
    };

    try {
      const ref = doc(db, 'users', userId);

      // Check if profile already exists
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const data = existing.data() as GuildUser;
        // If already founder, just update role
        if (data.role === 'founder') {
          return data;
        }
        // Upgrade to founder
        await setDoc(ref, { ...founder }, { merge: true });
      } else {
        await setDoc(ref, founder);
      }

      return founder;
    } catch (err) {
      console.error('Founder profile creation failed:', err);
      return null;
    }
  },

  /**
   * Create the federation root structure (guildRegions)
   */
  async createFederationRoot(): Promise<void> {
    const regions = [
      {
        id: 'IN',
        name: 'India',
        code: 'IN',
        timezone: 'Asia/Kolkata',
        defaultCurrency: 'INR',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archiveStatus: 'active'
      }
    ];

    const batch: any[] = [];

    for (const region of regions) {
      const ref = doc(db, 'guildRegions', region.id);
      batch.push(setDoc(ref, region));
    }

    await Promise.all(batch.map(b => b));
  },

  /**
   * Seed default jurisdiction structure for India
   * Creates guildStates collection with all Indian states
   */
  async seedDefaultJurisdiction(): Promise<void> {
    // India's states with IDs
    const indianStates = [
      { id: 'AP', name: 'Andhra Pradesh' },
      { id: 'AR', name: 'Arunachal Pradesh' },
      { id: 'AS', name: 'Assam' },
      { id: 'BR', name: 'Bihar' },
      { id: 'CG', name: 'Chhattisgarh' },
      { id: 'DL', name: 'Delhi' },
      { id: 'GA', name: 'Goa' },
      { id: 'GJ', name: 'Gujarat' },
      { id: 'HR', name: 'Haryana' },
      { id: 'HP', name: 'Himachal Pradesh' },
      { id: 'JH', name: 'Jharkhand' },
      { id: 'KA', name: 'Karnataka' },
      { id: 'KL', name: 'Kerala' },
      { id: 'MP', name: 'Madhya Pradesh' },
      { id: 'MH', name: 'Maharashtra' },
      { id: 'MN', name: 'Manipur' },
      { id: 'ML', name: 'Meghalaya' },
      { id: 'MZ', name: 'Mizoram' },
      { id: 'NL', name: 'Nagaland' },
      { id: 'OD', name: 'Odisha' },
      { id: 'PB', name: 'Punjab' },
      { id: 'RJ', name: 'Rajasthan' },
      { id: 'SK', name: 'Sikkim' },
      { id: 'TN', name: 'Tamil Nadu' },
      { id: 'TS', name: 'Telangana' },
      { id: 'TR', name: 'Tripura' },
      { id: 'UP', name: 'Uttar Pradesh' },
      { id: 'UK', name: 'Uttarakhand' },
      { id: 'WB', name: 'West Bengal' }
    ];

    // Create states
    for (const state of indianStates) {
      const stateRef = doc(db, 'guildStates', state.id);
      await setDoc(stateRef, {
        id: state.id,
        name: state.name,
        regionId: 'IN',
        regionName: 'India',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archiveStatus: 'active'
      });
    }

    // Create placeholder guildCities for headquarters
    const hqRef = doc(db, 'guildCities', 'HQ');
    await setDoc(hqRef, {
      id: 'HQ',
      name: 'Headquarters',
      stateId: 'NAT',
      stateName: 'National',
      regionId: 'IN',
      regionName: 'India',
      status: 'active',
      isHq: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archiveStatus: 'active'
    });
  },

  /**
   * Verify founder status on login
   * Call this when founder logs in to ensure proper role
   */
  async verifyFounder(userId: string, email: string): Promise<GuildRole | null> {
    if (!this.isFounderEmail(email)) {
      return null;
    }

    try {
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return null;
      }

      const data = snap.data() as GuildUser;
      return data.role;
    } catch (err) {
      console.error('Founder verification failed:', err);
      return null;
    }
  }
};