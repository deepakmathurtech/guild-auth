import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Quest, Organization, GuildUser } from '../types/guild';
import { NotificationService } from './notificationService';

/**
 * automationService.ts
 * 
 * Safe operational automations for Guild OS.
 */

export const AutomationService = {
  /**
   * Auto-archive completed quests after a retention period (e.g., 30 days)
   */
  async archiveCompletedQuests(profile: GuildUser) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const q = query(
      collection(db, 'quests'),
      where('status', '==', 'completed'),
      where('updatedAt', '<', thirtyDaysAgo),
      where('archiveStatus', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(d.ref, { 
        status: 'archived',
        archiveStatus: 'archived',
        updatedAt: new Date().toISOString()
      });
    });
    await batch.commit();
  },

  /**
   * Auto-detect overdue quests and notify stakeholders
   */
  async checkOverdueQuests(profile: GuildUser) {
    const now = new Date().toISOString();
    const q = query(
      collection(db, 'quests'),
      where('status', 'in', ['assigned', 'inProgress']),
      where('deadline', '<', now)
    );

    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const quest = d.data() as Quest;
      
      // Notify assigned members
      for (const memberId of quest.assignedMembers || []) {
        await NotificationService.notify(
          memberId,
          'quest_overdue',
          'Quest Overdue!',
          `The quest "${quest.title}" has passed its deadline. Please submit your progress immediately.`,
          'high',
          profile,
          { actionUrl: `/quests/${quest.id}`, deduplicate: true }
        );
      }

      // Notify receptionist
      if (quest.assignedReceptionistId) {
        await NotificationService.notify(
          quest.assignedReceptionistId,
          'quest_overdue',
          'Quest Overdue Alert',
          `Quest "${quest.title}" is overdue. Member follow-up required.`,
          'medium',
          profile,
          { actionUrl: `/quests/${quest.id}`, deduplicate: true }
        );
      }
    }
  },

  /**
   * Auto-flag inactive organizations (no interaction for 6 months)
   */
  async flagInactiveOrganizations(profile: GuildUser) {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const q = query(
      collection(db, 'organizations'),
      where('currentStatus', 'in', ['active', 'partner']),
      where('lastContactAt', '<', sixMonthsAgo)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(d.ref, { 
        currentStatus: 'inactive',
        updatedAt: new Date().toISOString()
      });
    });
    await batch.commit();
  },

  /**
   * Auto-remind pending verifications
   */
  async remindPendingVerifications(profile: GuildUser) {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const q = query(
      collection(db, 'questSubmissions'),
      where('status', '==', 'pending'),
      where('createdAt', '<', threeDaysAgo)
    );

    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const sub = d.data();
      if (sub.reviewerId) {
        await NotificationService.notify(
          sub.reviewerId,
          'verification_pending',
          'Pending Verification Reminder',
          `Submission for quest "${sub.questTitle || 'Unknown'}" has been pending for 3 days.`,
          'medium',
          profile,
          { actionUrl: `/submissions/${sub.id}`, deduplicate: true }
        );
      }
    }
  }
};
