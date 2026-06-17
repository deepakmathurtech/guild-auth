import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, addInteraction, subscribeRecords, listRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Organization, Quest, InteractionRecord, GuildUser } from '../../types/guild';
import { StatusBadge } from '../../components/StatusBadge';
import { where, orderBy, limit } from 'firebase/firestore';
import { Phone, Mail, MapPin, User, History, MessageSquare, Plus, ArrowLeftRight, Save } from 'lucide-react';

export function OrganizationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [receptionists, setReceptionists] = useState<GuildUser[]>([]);
  const [isLoggingInteraction, setIsLoggingInteraction] = useState(false);
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ summary: '', type: 'note' as any });

  useEffect(() => {
    if (!id) return;
    getRecord('organizations', id).then(setOrg);
    const unsubQuests = subscribeRecords('quests', setQuests, [where('organizationId', '==', id), where('archiveStatus', '==', 'active')]);
    const unsubInter = subscribeRecords('interactions', setInteractions, [where('organizationId', '==', id), orderBy('createdAt', 'desc'), limit(50)]);
    
    listRecords('users', [where('role', 'in', ['receptionist', 'guildManager', 'guildAdmin'])]).then(res => setReceptionists(res as GuildUser[]));

    return () => { unsubQuests(); unsubInter(); };
  }, [id]);

  async function handleLogInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !profile) return;
    await addInteraction(org.id, profile, interactionForm.summary, interactionForm.type);
    setIsLoggingInteraction(false);
    setInteractionForm({ summary: '', type: 'note' });
    await updateLedgerRecord('organizations', org.id, { lastContactAt: new Date().toISOString() }, profile, 'Interaction Logged');
  }

  async function handleTransferOwnership(newOwnerId: string) {
    if (!org || !profile) return;
    const newOwner = receptionists.find(r => r.uid === newOwnerId);
    await updateLedgerRecord('organizations', org.id, { 
      ownerId: newOwnerId, 
      responsibleReceptionist: newOwnerId 
    }, profile, `Ownership Transferred to ${newOwner?.fullName}`);
    setOrg({ ...org, ownerId: newOwnerId, responsibleReceptionist: newOwnerId });
    setIsTransferringOwnership(false);
  }

  if (!org) return <div className="p-10 text-center font-bold">Accessing Organization Ledger...</div>;

  return (
    <div className="workbench max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <button className="ghost px-2 py-1 mb-4 flex items-center gap-1 text-xs" onClick={() => navigate('/organizations')}><Phone className="rotate-90" size={12}/> Back to Directory</button>
          <p className="eyebrow">{org.category} &middot; Trust Level: {org.trustLevel}</p>
          <h1 className="text-4xl">{org.name}</h1>
          <div className="flex gap-2 mt-4">
             <StatusBadge status={org.currentStatus} />
             <span className="role-pill flex items-center gap-1"><User size={12}/> Owner: {receptionists.find(r => r.uid === (org.ownerId || org.responsibleReceptionist))?.fullName || 'Unassigned'}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="primary flex-1 md:flex-none" onClick={() => setIsLoggingInteraction(true)}><Plus size={18}/> Log Interaction</button>
          {profile?.role === 'guildFounder' && (
            <button className="ghost flex-1 md:flex-none" onClick={() => setIsTransferringOwnership(!isTransferringOwnership)}><ArrowLeftRight size={18}/> Transfer</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="panel">
            <h3 className="flex items-center gap-2 mb-6"><History size={20} className="text-[var(--primary)]"/> Relationship Timeline</h3>
            <div className="space-y-6">
              {isLoggingInteraction && (
                <form className="bg-[var(--bg-alt)] p-4 rounded-2xl border border-[var(--primary)]/30 animate-in zoom-in-95" onSubmit={handleLogInteraction}>
                  <div className="flex gap-2 mb-4">
                    {['call', 'meeting', 'visit', 'note'].map(type => (
                      <button key={type} type="button" onClick={() => setInteractionForm({...interactionForm, type: type as any})} className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${interactionForm.type === type ? 'bg-[var(--primary)] text-white' : 'bg-white text-[var(--muted)] border border-[var(--border)]'}`}>{type}</button>
                    ))}
                  </div>
                  <textarea className="mb-4" placeholder="What happened? Log key outcomes and next steps..." required value={interactionForm.summary} onChange={e => setInteractionForm({...interactionForm, summary: e.target.value})} />
                  <div className="flex justify-end gap-2">
                    <button className="ghost text-xs" type="button" onClick={() => setIsLoggingInteraction(false)}>Cancel</button>
                    <button className="primary text-xs" type="submit">Log in History</button>
                  </div>
                </form>
              )}

              {isTransferringOwnership && (
                <div className="bg-purple-500/10 p-4 rounded-2xl border border-purple-500/30">
                  <h4 className="text-sm font-bold mb-3">Transfer Responsibility</h4>
                  <div className="grid gap-2">
                    {receptionists.map(r => (
                      <button key={r.uid} className="flex justify-between items-center p-3 bg-white rounded-xl text-sm hover:border-purple-500 border border-transparent transition-all" onClick={() => handleTransferOwnership(r.uid)}>
                        <span>{r.fullName}</span>
                        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">{r.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {interactions.map((interaction, i) => (
                <div key={interaction.id} className="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-[-24px] before:w-[2px] before:bg-[var(--border)] last:before:hidden">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-[var(--primary)] grid place-items-center">
                    <MessageSquare size={12} className="text-[var(--primary)]" />
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{interaction.type} &middot; {new Date(interaction.createdAt).toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-[var(--primary)]">{receptionists.find(r => r.uid === interaction.createdBy)?.fullName}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{interaction.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="panel">
            <h3 className="mb-6">Contact Record</h3>
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-slate-500"><User size={20}/></div>
                <div>
                  <span className="block text-xs font-bold text-[var(--muted)]">Primary Contact</span>
                  <span className="text-sm font-bold">{org.contactPerson}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-slate-500"><Phone size={20}/></div>
                <div>
                  <span className="block text-xs font-bold text-[var(--muted)]">Phone</span>
                  <span className="text-sm font-bold">{org.phone || 'Not Logged'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-slate-500"><Mail size={20}/></div>
                <div>
                  <span className="block text-xs font-bold text-[var(--muted)]">Email</span>
                  <span className="text-sm font-bold">{org.email || 'Not Logged'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-slate-500"><MapPin size={20}/></div>
                <div>
                  <span className="block text-xs font-bold text-[var(--muted)]">Location</span>
                  <span className="text-sm font-bold">{org.city || org.address || 'Not Logged'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel bg-[var(--primary)] text-white border-none shadow-lg shadow-[var(--primary)]/20">
             <h3 className="mb-2">Operational Pipeline</h3>
             <p className="text-xs text-blue-100/60 mb-6">Total value generated by {org.name}</p>
             <div className="grid gap-4">
                <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                  <span className="text-xs font-bold">Active Quests</span>
                  <span className="text-lg font-black">{quests.length}</span>
                </div>
                <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                  <span className="text-xs font-bold">Generated Revenue</span>
                  <span className="text-lg font-black">₹{quests.reduce((s, q) => s + (q.paymentAmount || 0), 0)}</span>
                </div>
                <button className="bg-white text-[var(--primary)] w-full py-3 rounded-xl font-bold text-sm mt-2 hover:bg-blue-50 transition-colors" onClick={() => navigate('/needs', { state: { orgId: org.id, orgName: org.name } })}>Register New Need</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
