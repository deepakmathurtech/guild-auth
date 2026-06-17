import { useEffect, useMemo, useState } from 'react';
import { limit, orderBy, query, where, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { ActivityLog, DashboardMetric, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord, Quest, Outcome } from '../types/guild';
import { hasRole } from '../lib/rbac';
import { MemberDashboard } from '../components/dashboards/MemberDashboard';
import { ReceptionistDashboard } from '../components/dashboards/ReceptionistDashboard';
import { ManagerDashboard } from '../components/dashboards/ManagerDashboard';
import { AdminDashboard } from '../components/dashboards/AdminDashboard';
import { FounderDashboard } from '../components/dashboards/FounderDashboard';

function useCollection<T>(name: string, constraints: any[] = []) {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, name), ...constraints), (snapshot) => {
      setItems(snapshot.docs.map((doc) => doc.data() as T));
    });
    return unsubscribe;
  }, [name]);
  return items;
}

// Custom role dashboards are imported.

export function DashboardPage() {
  const { profile } = useAuth();
  const organizations = useCollection<Organization>('organizations', [where('archiveStatus', '==', 'active'), limit(200)]);
  const needs = useCollection<Need>('needs', [where('archiveStatus', '==', 'active'), limit(200)]);
  const opportunities = useCollection<Opportunity>('opportunities', [where('archiveStatus', '==', 'active'), limit(200)]);
  const submissions = useCollection<QuestSubmission>('questSubmissions', [where('archiveStatus', '==', 'active'), limit(200)]);
  const quests = useCollection<Quest>('quests', [where('archiveStatus', '==', 'active'), limit(200)]);
  const outcomes = useCollection<Outcome>('outcomes', [where('archiveStatus', '==', 'active'), limit(200)]);
  const revenue = useCollection<RevenueEvent>('revenueEvents', [where('archiveStatus', '==', 'active'), limit(200)]);
  const verifications = useCollection<VerificationRecord>('verifications', [where('archiveStatus', '==', 'active'), limit(200)]);
  const logs = useCollection<ActivityLog>('activityLogs', [orderBy('time', 'desc'), limit(10)]);

  const metrics = useMemo<DashboardMetric[]>(() => {
    const assignedOrgs = organizations.filter((item) => item.responsibleReceptionist === profile?.uid);
    const activeNeeds = needs.filter((item) => ['open', 'matching', 'assigned', 'inProgress'].includes(item.status));
    const activeOpps = opportunities.filter((item) => ['open', 'matching', 'assigned', 'inProgress'].includes(item.status));
    const pending = submissions.filter((item) => item.status === 'pending').length + verifications.filter((item) => item.decision === 'pending').length;
    const totalRevenue = revenue.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return [
      { label: 'Assigned Organizations', value: hasRole(profile?.role, ['guildManager', 'guildAdmin']) ? organizations.length : assignedOrgs.length },
      { label: 'Active Needs', value: activeNeeds.length },
      { label: 'Active Opportunities', value: activeOpps.length },
      { label: 'Pending Verifications', value: pending },
      { label: 'Revenue Tracked', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
      { label: 'Members Helped', value: new Set(opportunities.flatMap((item) => item.assignedMembers || [])).size }
    ];
  }, [organizations, needs, opportunities, submissions, verifications, revenue, profile?.role, profile?.uid]);

  const props = { organizations, needs, opportunities, quests, submissions, outcomes, revenue, verifications, logs };

  if (!profile) return <p>Loading...</p>;

  // Route to the specific dashboard based on role
  if (profile.role === 'member' || profile.role === 'contributor') {
    return <MemberDashboard {...props} />;
  }
  
  if (profile.role === 'receptionist') {
    return <ReceptionistDashboard {...props} />;
  }

  if (profile.role === 'guildManager') {
    return <ManagerDashboard metrics={metrics} {...props} />;
  }

  if (profile.role === 'founder') {
    return <FounderDashboard />;
  }

  // Fallback for guildAdmin and others
  return <AdminDashboard metrics={metrics} {...props} />;
}
