import { useEffect, useMemo, useState } from 'react';
import { limit, orderBy, query, where, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { ActivityLog, DashboardMetric, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord, Quest, Outcome } from '../types/guild';
import { hasRole } from '../lib/rbac';
import { MemberDashboard } from '../components/dashboards/MemberDashboard';
import { ReceptionistDashboard } from '../components/dashboards/ReceptionistDashboard';
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

export function DashboardPage() {
  const { profile } = useAuth();
  
  // Jurisdiction Filters
  const jurisConstraints = useMemo(() => {
    if (!profile) return [];
    const base = [where('archiveStatus', '==', 'active')];
    
    if (profile.role === 'guildFounder' || profile.role === 'centralGuildMaster' || profile.role === 'founder') return base;
    
    if (profile.role === 'stateGuildMaster') {
      return [...base, where('jurisdiction.stateId', '==', profile.jurisdiction.stateId)];
    }
    
    // Default: City scope
    return [...base, where('jurisdiction.cityId', '==', profile.jurisdiction.cityId)];
  }, [profile]);

  const organizations = useCollection<Organization>('organizations', [...jurisConstraints, limit(200)]);
  const needs = useCollection<Need>('needs', [...jurisConstraints, limit(200)]);
  const opportunities = useCollection<Opportunity>('opportunities', [...jurisConstraints, limit(200)]);
  const submissions = useCollection<QuestSubmission>('questSubmissions', [...jurisConstraints, limit(200)]);
  const quests = useCollection<Quest>('quests', [...jurisConstraints, limit(200)]);
  const outcomes = useCollection<Outcome>('outcomes', [...jurisConstraints, limit(200)]);
  const revenue = useCollection<RevenueEvent>('revenueEvents', [...jurisConstraints, limit(200)]);
  const verifications = useCollection<VerificationRecord>('verifications', [...jurisConstraints, limit(200)]);
  const logs = useCollection<ActivityLog>('activityLogs', [orderBy('time', 'desc'), limit(10)]);

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!profile) return [];
    const activeNeeds = needs.filter((item) => ['open', 'matching', 'assigned', 'inProgress'].includes(item.status));
    const activeOpps = opportunities.filter((item) => ['open', 'matching', 'assigned', 'inProgress'].includes(item.status));
    const pending = submissions.filter((item) => item.status === 'pending').length + verifications.filter((item) => item.decision === 'pending').length;
    const totalRevenue = revenue.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    
    return [
      { label: 'Organizations', value: organizations.length },
      { label: 'Active Needs', value: activeNeeds.length },
      { label: 'Active Opportunities', value: activeOpps.length },
      { label: 'Pending Verifications', value: pending },
      { label: 'Revenue Tracked', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
      { label: 'Members Helped', value: new Set(opportunities.flatMap((item) => item.assignedMembers || [])).size }
    ];
  }, [organizations, needs, opportunities, submissions, verifications, revenue, profile]);

  const props = { organizations, needs, opportunities, quests, submissions, outcomes, revenue, verifications, logs, metrics };

  if (!profile) return <p className="p-10 text-center font-bold">Synchronizing Federation Access...</p>;

  // 1. National Level
  if (profile.role === 'guildFounder' || profile.role === 'centralGuildMaster' || profile.role === 'founder') {
    return <FounderDashboard />;
  }
  
  // 2. State & City Level (ReceptionistDashboard can handle both with correct scoping)
  if (['stateGuildMaster', 'cityGuildMaster', 'receptionist'].includes(profile.role)) {
    return <ReceptionistDashboard {...props} />;
  }

  // 3. Member Level
  return <MemberDashboard {...props} />;
}
