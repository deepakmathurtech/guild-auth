import { useEffect, useMemo, useState } from 'react';
import { limit, orderBy, query, where, collection, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { ActivityLog, DashboardMetric, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord, Quest, Outcome } from '../types/guild';
import { MemberDashboard } from '../components/dashboards/MemberDashboard';
import { ReceptionistDashboard } from '../components/dashboards/ReceptionistDashboard';
import { FounderDashboard } from '../components/dashboards/FounderDashboard';

function useCollection<T>(name: string, constraints: any[] = []) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, name), ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((doc) => doc.data() as T));
      setLoading(false);
    }, (err) => {
      console.error(`Collection ${name} error:`, err);
      setLoading(false);
    });
    return unsubscribe;
  }, [name, constraints]);

  return { items, loading };
}

export function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  
  const jurisConstraints = useMemo(() => {
    if (!profile) return [];
    const base = [where('archiveStatus', '==', 'active')];
    
    if (['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) return base;
    
    if (profile.role === 'stateGuildMaster') {
      return [...base, where('jurisdiction.stateId', '==', profile.jurisdiction.stateId)];
    }
    
    return [...base, where('jurisdiction.cityId', '==', profile.jurisdiction.cityId)];
  }, [profile]);

  // Memoize all constraint arrays to avoid infinite loops
  const orgsConstraints = useMemo(() => [...jurisConstraints, limit(200)], [jurisConstraints]);
  const needsConstraints = useMemo(() => [...jurisConstraints, limit(200)], [jurisConstraints]);
  const oppsConstraints = useMemo(() => [...jurisConstraints, limit(200)], [jurisConstraints]);
  const subsConstraints = useMemo(() => [...jurisConstraints, where('status', '==', 'pending'), limit(200)], [jurisConstraints]);
  const questsConstraints = useMemo(() => [...jurisConstraints, limit(200)], [jurisConstraints]);
  const outcomesConstraints = useMemo(() => [...jurisConstraints, limit(200)], [jurisConstraints]);
  const revenueConstraints = useMemo(() => [...jurisConstraints, limit(200)], [jurisConstraints]);
  const verificationConstraints = useMemo(() => [...jurisConstraints, limit(200)], [jurisConstraints]);
  const logsConstraints = useMemo(() => [orderBy('time', 'desc'), limit(20)], []);

  useEffect(() => {
    if (!profile) return;
    
    // Production Scalability: Get actual counts from server for metrics
    const fetchCounts = async () => {
      try {
        const qOrgs = query(collection(db, 'organizations'), ...jurisConstraints);
        const qNeeds = query(collection(db, 'needs'), ...jurisConstraints, where('status', 'in', ['open', 'matching', 'assigned', 'inProgress']));
        const qOpps = query(collection(db, 'opportunities'), ...jurisConstraints, where('status', 'in', ['open', 'matching', 'assigned', 'inProgress']));
        const qSubs = query(collection(db, 'questSubmissions'), ...jurisConstraints, where('status', '==', 'pending'));

        const [sOrgs, sNeeds, sOpps, sSubs] = await Promise.all([
          getCountFromServer(qOrgs),
          getCountFromServer(qNeeds),
          getCountFromServer(qOpps),
          getCountFromServer(qSubs)
        ]);

        setCounts({
          organizations: sOrgs.data().count,
          activeNeeds: sNeeds.data().count,
          activeOpps: sOpps.data().count,
          pendingSubmissions: sSubs.data().count
        });
      } catch (err) {
        console.error('Count fetch error:', err);
      }
    };

    fetchCounts();
  }, [profile, jurisConstraints]);

  const { items: organizations, loading: orgsLoading } = useCollection<Organization>('organizations', orgsConstraints);
  const { items: needs } = useCollection<Need>('needs', needsConstraints);
  const { items: opportunities } = useCollection<Opportunity>('opportunities', oppsConstraints);
  const { items: submissions } = useCollection<QuestSubmission>('questSubmissions', subsConstraints);
  const { items: quests } = useCollection<Quest>('quests', questsConstraints);
  const { items: outcomes } = useCollection<Outcome>('outcomes', outcomesConstraints);
  const { items: revenue } = useCollection<RevenueEvent>('revenueEvents', revenueConstraints);
  const { items: verifications } = useCollection<VerificationRecord>('verifications', verificationConstraints);
  const { items: logs } = useCollection<ActivityLog>('activityLogs', logsConstraints);

  const metrics = useMemo<DashboardMetric[]>(() => {
    if (!profile) return [];
    const totalRevenue = revenue.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    
    return [
      { label: 'Organizations', value: counts.organizations ?? organizations.length },
      { label: 'Active Needs', value: counts.activeNeeds ?? 0 },
      { label: 'Active Opportunities', value: counts.activeOpps ?? 0 },
      { label: 'Pending Verifications', value: counts.pendingSubmissions ?? 0 },
      { label: 'Revenue Tracked', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
      { label: 'Members Helped', value: new Set(opportunities.flatMap((item) => item.assignedMembers || [])).size }
    ];
  }, [organizations, needs, opportunities, submissions, revenue, profile, counts]);

  if (authLoading || (orgsLoading && organizations.length === 0)) return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-up">
      <div className="w-12 h-12 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Synchronizing Federation Access...</p>
    </div>
  );

  if (!profile) return null;

  const props = { organizations, needs, opportunities, quests, submissions, outcomes, revenue, verifications, logs, metrics };

  if (['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) {
    return <FounderDashboard />;
  }
  
  if (['stateGuildMaster', 'cityGuildMaster', 'receptionist'].includes(profile.role)) {
    return <ReceptionistDashboard {...props} />;
  }

  return <MemberDashboard {...props} />;
}

