import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { Shield, Users, ArrowRightCircle, AlertTriangle, Clock, CheckCircle, XCircle, UserMinus, UserPlus, Building, Map, Merge } from 'lucide-react';
import { HumanOpsService } from '../../services/humanOpsService';
import type { GuildUser, LeaveRecord, EscalationRecord, DisputeRecord, TransferRecord, SuccessionPlan } from '../../types/guild';

type Tab = 'succession' | 'leave' | 'escalation' | 'dispute' | 'transfer' | 'pipeline' | 'health';

export function HumanOpsPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('pipeline');
  const [loading, setLoading] = useState(true);

  if (!profile) return null;

  const tabs = [
    { id: 'pipeline', label: 'Operations', icon: ArrowRightCircle },
    { id: 'succession', label: 'Succession', icon: Shield },
    { id: 'leave', label: 'Leave', icon: Clock },
    { id: 'escalation', label: 'Escalation', icon: AlertTriangle },
    { id: 'dispute', label: 'Disputes', icon: XCircle },
    { id: 'transfer', label: 'Transfers', icon: Merge },
    { id: 'health', label: 'Health', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Human Operations</p>
          <h1>Federation Management</h1>
          <p className="text-[var(--text-secondary)]">
            Manage succession, leave, escalations, disputes, and transfers.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && <OperationsPipeline />}
      {tab === 'succession' && <SuccessionTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'escalation' && <EscalationTab />}
      {tab === 'dispute' && <DisputeTab />}
      {tab === 'transfer' && <TransferTab />}
      {tab === 'health' && <HealthTab />}
    </div>
  );
}

function OperationsPipeline() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>({ needs: 0, opportunities: 0, quests: 0, submissions: 0, outcomes: 0 });

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const q = profile.role.includes('Founder')
          ? query(collection(db, 'needs'), where('archiveStatus', '==', 'active'))
          : query(collection(db, 'needs'), where('jurisdiction.cityId', '==', profile.jurisdiction?.cityId));

        const [needsSnap, oppsSnap, questsSnap, subsSnap, outcomesSnap] = await Promise.all([
          getDocs(q),
          getDocs(query(collection(db, 'opportunities'))),
          getDocs(query(collection(db, 'quests'))),
          getDocs(query(collection(db, 'questSubmissions'))),
          getDocs(query(collection(db, 'outcomes')))
        ]);

        setStats({
          needs: needsSnap.size,
          opportunities: oppsSnap.size,
          quests: questsSnap.size,
          submissions: subsSnap.size,
          outcomes: outcomesSnap.size
        });
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [profile]);

  const stages = [
    { id: 'need', label: 'Need', count: stats.needs, color: 'bg-blue-500' },
    { id: 'opportunity', label: 'Opportunity', count: stats.opportunities, color: 'bg-purple-500' },
    { id: 'quest', label: 'Quest', count: stats.quests, color: 'bg-emerald-500' },
    { id: 'submission', label: 'Review', count: stats.submissions, color: 'bg-amber-500' },
    { id: 'outcome', label: 'Outcome', count: stats.outcomes, color: 'bg-rose-500' },
  ];

  return (
    <div className="panel p-6">
      <h2 className="text-lg font-bold mb-6">Operations Pipeline</h2>
      <div className="flex items-center gap-4 overflow-x-auto pb-4">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-4 min-w-[140px]">
            <div className={`w-12 h-12 rounded-xl ${stage.color}/20 flex items-center justify-center`}>
              <span className={`w-3 h-3 rounded-full ${stage.color}`} />
            </div>
            <div>
              <div className="text-2xl font-black">{stage.count}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{stage.label}</div>
            </div>
            {i < stages.length - 1 && (
              <ArrowRightCircle className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessionTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<GuildUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const q = profile.role.includes('Founder')
          ? query(collection(db, 'users'), orderBy('createdAt', 'desc'), where('archiveStatus', '==', 'active'))
          : query(collection(db, 'users'), where('jurisdiction.cityId', '==', profile.jurisdiction?.cityId));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => d.data() as GuildUser));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  const leaders = users.filter(u => ['receptionist', 'cityGuildMaster', 'stateGuildMaster'].includes(u.role));

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-lg font-bold mb-4">Succession Planning</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Assign backup successors for leadership roles to prevent orphaned responsibilities.
        </p>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <div className="space-y-3">
            {leaders.map(user => (
              <div key={user.uid} className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
                <div>
                  <div className="font-bold">{user.fullName}</div>
                  <div className="text-xs text-[var(--text-muted)]">{user.role} - {user.jurisdiction?.cityName}</div>
                </div>
                <button className="text-sm px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20">
                  Configure
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaveTab() {
  const { profile } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const q = query(collection(db, 'leaveRecords'), orderBy('createdAt', 'desc'), where('archiveStatus', '==', 'active'));
        const snap = await getDocs(q);
        setLeaves(snap.docs.map(d => d.data() as LeaveRecord));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-lg font-bold mb-4">Leave Management</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Request leave or approve team leave with temporary delegation.
        </p>

        <div className="flex gap-2 mb-6">
          <button className="text-sm px-4 py-2 rounded-lg bg-[var(--primary)] text-white">
            Request Leave
          </button>
          {profile?.role.includes('Master') && (
            <button className="text-sm px-4 py-2 rounded-lg border border-[var(--border)]">
              Approve Requests
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">No leave records</div>
        ) : (
          <div className="space-y-2">
            {leaves.map(leave => (
              <div key={leave.id} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg">
                <div>
                  <div className="text-sm font-medium">{leave.type} leave</div>
                  <div className="text-xs text-[var(--text-muted)]">{leave.startDate}</div>
                </div>
                <span className={`badge ${
                  leave.status === 'approved' ? 'badge-green' :
                  leave.status === 'rejected' ? 'badge-red' : 'badge-amber'
                }`}>{leave.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EscalationTab() {
  const { profile } = useAuth();
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const q = query(collection(db, 'escalationRecords'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setEscalations(snap.docs.map(d => d.data() as EscalationRecord));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-lg font-bold mb-4">Escalations</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Escalate issues requiring leadership attention.
        </p>

        <div className="flex gap-2 mb-6">
          <button className="text-sm px-4 py-2 rounded-lg bg-[var(--primary)] text-white">
            File Escalation
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : escalations.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">No escalations</div>
        ) : (
          <div className="space-y-2">
            {escalations.map(esc => (
              <div key={esc.id} className="p-3 border border-[var(--border)] rounded-lg">
                <div className="text-sm font-medium">{esc.reason}</div>
                <div className="text-xs text-[var(--text-muted)]">{esc.entityType} - {esc.fromRole} → {esc.toRole}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisputeTab() {
  const { profile } = useAuth();
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const q = query(collection(db, 'disputeRecords'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setDisputes(snap.docs.map(d => d.data() as DisputeRecord));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-lg font-bold mb-4">Disputes</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          File and resolve disputes with evidence tracking.
        </p>

        <div className="flex gap-2 mb-6">
          <button className="text-sm px-4 py-2 rounded-lg bg-[var(--primary)] text-white">
            File Dispute
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : disputes.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">No disputes</div>
        ) : (
          <div className="space-y-2">
            {disputes.map(d => (
              <div key={d.id} className="p-3 border border-[var(--border)] rounded-lg">
                <div className="text-sm font-medium">{d.category}</div>
                <div className="text-xs text-[var(--text-muted)]">{d.description?.slice(0, 100)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransferTab() {
  const { profile } = useAuth();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const q = query(collection(db, 'transferRecords'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setTransfers(snap.docs.map(d => d.data() as TransferRecord));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-lg font-bold mb-4">Transfers</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Transfer ownership of organizations, branches, and responsibilities.
        </p>

        {profile?.role.includes('Founder') && (
          <div className="flex gap-2 mb-6">
            <button className="text-sm px-4 py-2 rounded-lg bg-[var(--primary)] text-white">
              Create Transfer
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : transfers.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">No transfers</div>
        ) : (
          <div className="space-y-2">
            {transfers.map(t => (
              <div key={t.id} className="p-3 border border-[var(--border)] rounded-lg">
                <div className="text-sm font-medium">{t.entityTypes?.join(', ')}</div>
                <div className="text-xs text-[var(--text-muted)]">{t.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthTab() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>({ members: 0, orgs: 0, needs: 0, quests: 0, openEscalations: 0 });

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const [members, orgs, needs, quests, escalations] = await Promise.all([
          getDocs(query(collection(db, 'users'))),
          getDocs(query(collection(db, 'organizations'))),
          getDocs(query(collection(db, 'needs'))),
          getDocs(query(collection(db, 'quests'))),
          getDocs(query(collection(db, 'escalationRecords'), where('status', '==', 'open')))
        ]);
        setData({
          members: members.size,
          orgs: orgs.size,
          needs: needs.size,
          quests: quests.size,
          openEscalations: escalations.size
        });
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="text-2xl font-black">{data.members}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Members</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black">{data.orgs}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Organizations</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black">{data.needs}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Needs</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black">{data.quests}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Quests</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black text-rose-500">{data.openEscalations}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Open Escalations</div>
        </div>
      </div>
    </div>
  );
}