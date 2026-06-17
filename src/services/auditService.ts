import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { LedgerCollection } from '../types/guild';

export interface V4AuditLog {
  action: string;
  performerId: string;
  performerName?: string;
  targetId?: string;
  targetType?: LedgerCollection | 'system' | 'auth';
  metadata?: Record<string, any>;
  timestamp: string;
  timestampServer: any;
}

export const AuditService = {
  async log(
    action: string, 
    performerId: string, 
    details: { 
      performerName?: string; 
      targetId?: string; 
      targetType?: LedgerCollection | 'system' | 'auth'; 
      metadata?: Record<string, any> 
    }
  ) {
    const logEntry: V4AuditLog = {
      action,
      performerId,
      performerName: details.performerName,
      targetId: details.targetId,
      targetType: details.targetType,
      metadata: details.metadata,
      timestamp: new Date().toISOString(),
      timestampServer: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'v4AuditLogs'), logEntry);
      
      // Also write to legacy activityHistory if target is a user
      if (details.targetType === 'users' && details.targetId) {
        // This would require a separate update call to the user document
        // For brevity, we focus on the dedicated v4AuditLogs collection
      }
    } catch (error) {
      console.error('Failed to write audit log', error);
    }
  }
};
