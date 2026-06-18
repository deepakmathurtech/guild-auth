import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, addInteraction, subscribeRecords, listRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Organization, Quest, InteractionRecord, GuildUser } from '../../types/guild';
import { StatusBadge } from '../../components/StatusBadge';
import { where, orderBy, limit } from 'firebase/firestore';
import { 
  Phone, Mail, MapPin, User, History, 
  MessageSquare, Plus, ArrowLeftRight, Save,
  ChevronLeft, ExternalLink, Shield, Globe,
  MoreVertical, Calendar, UserPlus, Star
} from 'lucide-react';

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

  if (!org) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
    </div>
  );

  const owner = receptionists.find(r => r.uid === (org.ownerId || org.responsibleReceptionist));

  return (
    <div className="space-y-10 pb-20 animate-fade-up">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
          <button 
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" 
            onClick={() => navigate('/organizations')}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Organizations Directory
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="role-pill !bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20">
                {org.category}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <Star className="w-3 h-3 fill-current" /> Trust: {org.trustLevel}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{org.name}</h1>
            <div className="flex flex-wrap gap-4 items-center">
              <StatusBadge status={org.currentStatus} />
              <div className="h-4 w-px bg-[var(--border)]" />
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-[10px] font-bold">
                  {owner?.fullName.charAt(0) || 'U'}
                </div>
                <span className="font-medium">Account Owner: {owner?.fullName || 'Unassigned'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button className="secondary flex-1 md:flex-none" onClick={() => setIsLoggingInteraction(true)}>
            <MessageSquare className="w-4 h-4" /> Log Note
          </button>
          {['guildFounder', 'founder', 'centralGuildMaster'].includes(profile?.role || '') && (
            <button className="secondary flex-1 md:flex-none" onClick={() => setIsTransferringOwnership(!isTransferringOwnership)}>
              <UserPlus className="w-4 h-4" /> Transfer
            </button>
          )}
          <button className="primary flex-1 md:flex-none" onClick={() => navigate('/needs', { state: { orgId: org.id, orgName: org.name, showCreate: true } })}>
            <Plus className="w-4 h-4" /> New Need
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        {/* Relationship Timeline */}
        <div className="space-y-8">
          <section className="panel">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-xl font-bold tracking-tight">Relationship Timeline</h2>
              </div>
              <StatusBadge status="History" className="!bg-[var(--card-subtle)]" />
            </div>

            <div className="space-y-8 relative">
              {isLoggingInteraction && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <form className="p-6 rounded-2xl bg-[var(--card-subtle)] border border-[var(--primary)]/30" onSubmit={handleLogInteraction}>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {['call', 'meeting', 'visit', 'note'].map(type => (
                        <button 
                          key={type} 
                          type="button" 
                          onClick={() => setInteractionForm({...interactionForm, type: type as any})} 
                          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${interactionForm.type === type ? 'bg-[var(--primary)] text-black' : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--text-muted)]'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      className="mb-4 bg-[var(--bg)] border-[var(--border)] text-sm" 
                      placeholder="Record the key outcomes of this interaction..." 
                      required 
                      rows={4}
                      value={interactionForm.summary} 
                      onChange={e => setInteractionForm({...interactionForm, summary: e.target.value})} 
                    />
                    <div className="flex justify-end gap-3">
                      <button className="ghost !py-2 text-xs" type="button" onClick={() => setIsLoggingInteraction(false)}>Cancel</button>
                      <button className="primary !py-2 text-xs" type="submit">Finalize Entry</button>
                    </div>
                  </form>
                </div>
              )}

              {isTransferringOwnership && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                    <h4 className="text-sm font-bold mb-4">Transfer Account Responsibility</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {receptionists.map(r => (
                        <button 
                          key={r.uid} 
                          className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-purple-500 transition-all text-left" 
                          onClick={() => handleTransferOwnership(r.uid)}
                        >
                          <div>
                            <p className="text-sm font-bold">{r.fullName}</p>
                            <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">{r.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button className="w-full mt-4 ghost !py-2 text-xs" onClick={() => setIsTransferringOwnership(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-10">
                {interactions.map((interaction, i) => (
                  <div key={interaction.id} className="relative pl-10">
                    {/* Vertical Line */}
                    {i !== interactions.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-40px] w-0.5 bg-[var(--border)]" />
                    )}
                    
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[var(--bg)] border-2 border-[var(--primary)] flex items-center justify-center z-10 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                    </div>

                    <div className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                            {interaction.type}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-[var(--border)]" />
                          <span className="text-[10px] font-medium text-[var(--text-muted)]">
                            {new Date(interaction.createdAt).toLocaleDateString()} at {new Date(interaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          {receptionists.find(r => r.uid === interaction.createdBy)?.fullName}
                        </span>
                      </div>
                      <div className="p-5 rounded-2xl bg-[var(--card-subtle)]/50 border border-[var(--border)] group-hover:border-[var(--border-light)] transition-all">
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{interaction.summary}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {interactions.length === 0 && !isLoggingInteraction && (
                  <div className="py-20 text-center">
                    <p className="text-[var(--text-muted)] text-sm italic">No interactions recorded for this organization.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <aside className="space-y-8">
          <section className="panel p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" /> Corporate Dossier
            </h3>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Primary Liaison</p>
                  <p className="text-sm font-bold text-[var(--text)]">{org.contactPerson}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Direct Line</p>
                  <p className="text-sm font-bold text-[var(--text)]">{org.phone || 'Not Logged'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Communication</p>
                  <p className="text-sm font-bold text-[var(--text)]">{org.email || 'Not Logged'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Location</p>
                  <p className="text-sm font-bold text-[var(--text)]">{org.city || org.address || 'Not Logged'}</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-10 secondary !py-2.5 text-xs">
               Export Activity Report
            </button>
          </section>

          <section className="panel p-6 bg-gradient-to-br from-[var(--primary)]/10 to-transparent border-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/5">
             <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--primary)] mb-6 flex items-center gap-2">
               <Shield className="w-3.5 h-3.5" /> Operational Output
             </h3>
             
             <div className="grid gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Active Quests</p>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold text-white">{quests.length}</p>
                    <StatusBadge status="Live" className="!bg-emerald-500/20 !text-emerald-400 !border-none !text-[9px]" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Contribution Value</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-white">₹{quests.reduce((s, q) => s + (q.paymentAmount || 0), 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
             </div>
             
             <div className="mt-8 space-y-3">
               <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 text-center">Relationship Maturity</p>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${Math.min(({ new: 25, verified: 50, trusted: 75, partner: 100 }[org.trustLevel] || 25), 100)}%` }} />
               </div>
             </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
