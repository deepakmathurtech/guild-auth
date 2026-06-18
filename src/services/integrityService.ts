import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Quest, Opportunity, Need, QuestSubmission } from '../types/guild';

/**
 * integrityService.ts
 * 
 * Data Integrity & Orphan Detection Engine.
 */

export const IntegrityService = {
  async checkOrphans() {
    const results = {
      orphanQuests: [] as string[],
      orphanOpportunities: [] as string[],
      orphanSubmissions: [] as string[]
    };

    // 1. Check Quests
    const questsSnap = await getDocs(collection(db, 'quests'));
    for (const d of questsSnap.docs) {
      const q = d.data() as Quest;
      if (q.opportunityId) {
        const oppSnap = await getDoc(doc(db, 'opportunities', q.opportunityId));
        if (!oppSnap.exists()) results.orphanQuests.push(d.id);
      }
    }

    // 2. Check Opportunities
    const oppsSnap = await getDocs(collection(db, 'opportunities'));
    for (const d of oppsSnap.docs) {
      const o = d.data() as Opportunity;
      if (o.needId) {
        const needSnap = await getDoc(doc(db, 'needs', o.needId));
        if (!needSnap.exists()) results.orphanOpportunities.push(d.id);
      }
    }

    // 3. Check Submissions
    const subsSnap = await getDocs(collection(db, 'questSubmissions'));
    for (const d of subsSnap.docs) {
      const s = d.data() as QuestSubmission;
      const questSnap = await getDoc(doc(db, 'quests', s.questId));
      if (!questSnap.exists()) results.orphanSubmissions.push(d.id);
    }

    return results;
  }
};
