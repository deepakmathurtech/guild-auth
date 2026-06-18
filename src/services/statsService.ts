import { collection, query, where, getDocs, getCountFromServer, getAggregateFromServer, sum, average } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Quest, Organization, GuildUser, Jurisdiction } from '../types/guild';

/**
 * statsService.ts
 * 
 * Centralized engine for business metrics and operational calculations.
 */

export const StatsService = {
  // Quest Calculations
  async getQuestStats(questId: string) {
    const q = await getDocs(query(collection(db, 'quests'), where('id', '==', questId)));
    if (q.empty) return null;
    const quest = q.docs[0].data() as Quest;

    const filled = quest.assignedMembers?.length || 0;
    const required = quest.membersRequired || 1;
    const pendingApps = quest.applicants?.length || 0;

    return {
      filledPercentage: Math.round((filled / required) * 100),
      remainingSlots: Math.max(0, required - filled),
      pendingApplications: pendingApps,
      isFull: filled >= required
    };
  },

  // Organization Calculations
  async getOrganizationStats(orgId: string) {
    const qQuests = query(collection(db, 'quests'), where('organizationId', '==', orgId));
    const snapshot = await getDocs(qQuests);
    const quests = snapshot.docs.map(d => d.data() as Quest);

    const total = quests.length;
    const completed = quests.filter(q => q.status === 'completed' || q.status === 'closed').length;
    const revenue = quests.reduce((acc, q) => acc + (q.actualValue || q.paymentAmount || 0), 0);
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalQuests: total,
      completedQuests: completed,
      revenueGenerated: revenue,
      successRate: `${successRate}%`
    };
  },

  // Receptionist Calculations
  async getReceptionistWorkload(receptionistId: string) {
    const qOpps = query(collection(db, 'opportunities'), where('assignedReceptionist', '==', receptionistId), where('status', '!=', 'completed'));
    const qQuests = query(collection(db, 'quests'), where('assignedReceptionistId', '==', receptionistId), where('status', 'in', ['open', 'assigned', 'inProgress', 'underReview']));
    const qSubmissions = query(collection(db, 'questSubmissions'), where('reviewerId', '==', receptionistId), where('status', '==', 'pending'));

    const [opps, quests, subs] = await Promise.all([
      getCountFromServer(qOpps),
      getCountFromServer(qQuests),
      getCountFromServer(qSubmissions)
    ]);

    return {
      activeOpportunities: opps.data().count,
      activeQuests: quests.data().count,
      pendingReviews: subs.data().count,
      totalWorkload: opps.data().count + quests.data().count + subs.data().count
    };
  },

  // Jurisdiction Calculations
  async getJurisdictionStats(jurisdiction: Partial<Jurisdiction>) {
    let qUsers = query(collection(db, 'users'));
    let qOrgs = query(collection(db, 'organizations'));
    let qQuests = query(collection(db, 'quests'));
    let qRev = query(collection(db, 'revenueEvents'));

    if (jurisdiction.cityId) {
      qUsers = query(qUsers, where('jurisdiction.cityId', '==', jurisdiction.cityId));
      qOrgs = query(qOrgs, where('jurisdiction.cityId', '==', jurisdiction.cityId));
      qQuests = query(qQuests, where('jurisdiction.cityId', '==', jurisdiction.cityId));
      qRev = query(qRev, where('jurisdiction.cityId', '==', jurisdiction.cityId));
    } else if (jurisdiction.stateId) {
      qUsers = query(qUsers, where('jurisdiction.stateId', '==', jurisdiction.stateId));
      qOrgs = query(qOrgs, where('jurisdiction.stateId', '==', jurisdiction.stateId));
      qQuests = query(qQuests, where('jurisdiction.stateId', '==', jurisdiction.stateId));
      // revenueEvents might not have stateId indexed yet, but we'll assume it for now
    }

    const [uCount, oCount, qCount, rSum] = await Promise.all([
      getCountFromServer(qUsers),
      getCountFromServer(qOrgs),
      getCountFromServer(qQuests),
      getAggregateFromServer(qRev, { total: sum('amount') })
    ]);

    return {
      totalMembers: uCount.data().count,
      totalOrganizations: oCount.data().count,
      totalQuests: qCount.data().count,
      totalRevenue: rSum.data().total || 0
    };
  }
};


