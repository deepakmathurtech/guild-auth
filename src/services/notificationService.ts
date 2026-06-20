import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  orderBy,
  limit,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { 
  GuildUser, 
  NotificationRecord, 
  NotificationType, 
  NotificationPriority, 
  NotificationStatus 
} from '../types/guild';
import { createLedgerRecord } from '../lib/repository';

/**
 * notificationService.ts
 * 
 * Advanced Notification Management for Guild OS.
 * Handles deduplication, aggregation, escalation, and lifecycle.
 */

export const NotificationService = {
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    priority: NotificationPriority = 'medium',
    profile: GuildUser,
    options: {
      actionUrl?: string;
      metadata?: Record<string, unknown>;
      deduplicate?: boolean;
      aggregate?: boolean;
    } = {}
  ) {
    const notificationsRef = collection(db, 'notifications');

    // Deduplication / Aggregation Logic
    if (options.deduplicate || options.aggregate) {
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('type', '==', type),
        where('status', '==', 'unread'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const existing = await getDocs(q);
      if (!existing.empty) {
        const docSnap = existing.docs[0];
        const data = docSnap.data() as NotificationRecord;

        // If metadata matches (e.g. same questId), deduplicate or aggregate
        const isSameEntity = options.metadata?.entityId === data.metadata?.entityId;

        if (isSameEntity) {
          if (options.deduplicate) {
            // Just update the timestamp
            await updateDoc(docSnap.ref, {
              updatedAt: new Date().toISOString(),
              lastOccurrence: new Date().toISOString()
            });
            return docSnap.id;
          }

          if (options.aggregate) {
            const count = (data.aggregatedCount || 1) + 1;
            await updateDoc(docSnap.ref, {
              title: options.aggregate ? `${title} (${count})` : title,
              body: options.aggregate ? body : data.body,
              aggregatedCount: count,
              updatedAt: new Date().toISOString(),
              lastOccurrence: new Date().toISOString()
            });
            return docSnap.id;
          }
        }
      }
    }

    // Create New Notification
    const notificationData: Partial<NotificationRecord> = {
      userId,
      type,
      priority,
      status: 'unread',
      title,
      body,
      read: false,
      channel: 'inApp',
      futureChannels: ['email'],
      actionUrl: options.actionUrl,
      aggregatedCount: 1,
      lastOccurrence: new Date().toISOString()
    };
    if (options.metadata) {
      notificationData.metadata = options.metadata as Record<string, unknown>;
    }
    const notification = await createLedgerRecord('notifications', notificationData as NotificationRecord, profile, 'Notification Triggered', true);

    return notification.id;
  },

  async markAsRead(notificationId: string, profile: GuildUser) {
    await updateDoc(doc(db, 'notifications', notificationId), {
      status: 'read',
      read: true,
      updatedAt: new Date().toISOString()
    });
  },

  async dismiss(notificationId: string, profile: GuildUser) {
    await updateDoc(doc(db, 'notifications', notificationId), {
      status: 'dismissed',
      updatedAt: new Date().toISOString()
    });
  },

  async archive(notificationId: string, profile: GuildUser) {
    await updateDoc(doc(db, 'notifications', notificationId), {
      status: 'archived',
      updatedAt: new Date().toISOString()
    });
  },

  async bulkAction(userId: string, action: NotificationStatus, notificationIds?: string[]) {
    const batch = writeBatch(db);
    
    if (notificationIds) {
      notificationIds.forEach(id => {
        batch.update(doc(db, 'notifications', id), {
          status: action,
          read: action === 'read',
          updatedAt: new Date().toISOString()
        });
      });
    } else {
      // Mark all unread as 'action' for this user
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('status', '==', 'unread')
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, {
          status: action,
          read: action === 'read',
          updatedAt: new Date().toISOString()
        });
      });
    }

    await batch.commit();
  },

  /**
   * Automatic Cleanup Logic
   * Should be called by a maintenance task.
   */
  async performCleanup() {
    const now = new Date();
    const batch = writeBatch(db);
    
    // Low Priority: Archive after 30 days
    const lowDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const qLow = query(
      collection(db, 'notifications'),
      where('priority', '==', 'low'),
      where('status', '!=', 'archived'),
      where('createdAt', '<', lowDate)
    );
    
    // Medium Priority: Archive after 90 days
    const medDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const qMed = query(
      collection(db, 'notifications'),
      where('priority', '==', 'medium'),
      where('status', '!=', 'archived'),
      where('createdAt', '<', medDate)
    );

    const [lowSnap, medSnap] = await Promise.all([getDocs(qLow), getDocs(qMed)]);
    
    lowSnap.docs.forEach(d => batch.update(d.ref, { status: 'archived' }));
    medSnap.docs.forEach(d => batch.update(d.ref, { status: 'archived' }));

    await batch.commit();
  },

  /**
   * Escalation Logic
   * If a warning remains unresolved, escalate up the chain.
   */
  async checkEscalations(profile: GuildUser) {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
    // Example: Escalating unread "verification_pending" notifications
    const q = query(
      collection(db, 'notifications'),
      where('type', '==', 'verification_pending'),
      where('status', '==', 'unread'),
      where('createdAt', '<', threeDaysAgo)
    );

    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const data = d.data() as NotificationRecord;
      // Escalation logic here... 
      // This would normally need to find the user's manager etc.
      console.log(`Escalating notification ${d.id} for user ${data.userId}`);
    }
  }
};
