import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { User, GuildUser } from '../types/guild';
import {
  User as UserIcon, Building, ChevronLeft, Phone, Mail,
  Save, X
} from 'lucide-react';

const STATE_OPTIONS = [
  { id: 'punjab', name: 'Punjab' },
  { id: 'haryana', name: 'Haryana' },
  { id: 'delhi', name: 'Delhi' },
  { id: 'maharashtra', name: 'Maharashtra' },
  { id: 'karnataka', name: 'Karnataka' },
  { id: 'tamil_nadu', name: 'Tamil Nadu' },
  { id: 'uttar_pradesh', name: 'Uttar Pradesh' },
  { id: 'gujarat', name: 'Gujarat' },
  { id: 'rajasthan', name: 'Rajasthan' },
];

const CITIES_BY_STATE: Record<string, { id: string; name: string }[]> = {
  punjab: [
    { id: 'ludhiana', name: 'Ludhiana' },
    { id: 'chandigarh', name: 'Chandigarh' },
    { id: 'amritsar', name: 'Amritsar' },
    { id: 'jalandhar', name: 'Jalandhar' },
    { id: 'patiala', name: 'Patiala' },
  ],
  haryana: [
    { id: 'gurgaon', name: 'Gurgaon' },
    { id: 'faridabad', name: 'Faridabad' },
    { id: 'panipat', name: 'Panipat' },
    { id: 'karnal', name: 'Karnal' },
  ],
  delhi: [
    { id: 'delhi', name: 'Delhi' },
    { id: 'new_delhi', name: 'New Delhi' },
  ],
  maharashtra: [
    { id: 'mumbai', name: 'Mumbai' },
    { id: 'pune', name: 'Pune' },
    { id: 'nagpur', name: 'Nagpur' },
    { id: 'nashik', name: 'Nashik' },
  ],
  karnataka: [
    { id: 'bangalore', name: 'Bangalore' },
    { id: 'mysore', name: 'Mysore' },
    { id: 'mangalore', name: 'Mangalore' },
  ],
  tamil_nadu: [
    { id: 'chennai', name: 'Chennai' },
    { id: 'coimbatore', name: 'Coimbatore' },
    { id: 'madurai', name: 'Madurai' },
  ],
  uttar_pradesh: [
    { id: 'lucknow', name: 'Lucknow' },
    { id: 'kanpur', name: 'Kanpur' },
    { id: 'varanasi', name: 'Varanasi' },
    { id: 'agra', name: 'Agra' },
  ],
  gujarat: [
    { id: 'ahmedabad', name: 'Ahmedabad' },
    { id: 'surat', name: 'Surat' },
    { id: 'vadodara', name: 'Vadodara' },
    { id: 'rajkot', name: 'Rajkot' },
  ],
  rajasthan: [
    { id: 'jaipur', name: 'Jaipur' },
    { id: 'jodhpur', name: 'Jodhpur' },
    { id: 'udaipur', name: 'Udaipur' },
    { id: 'kota', name: 'Kota' },
  ],
};

export function EditMemberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();

  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const isOwnerView = !id || id === currentUser?.uid;
  const canEditBranch = currentUser?.role && ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'].includes(currentUser.role);

  useEffect(() => {
    async function loadData() {
      if (!id && !currentUser) return;

      const targetId = id || currentUser!.uid;

      try {
        const userDoc = await getDoc(doc(db, 'users', targetId));
        if (!userDoc.exists()) {
          navigate('/members');
          return;
        }

        const userData = userDoc.data() as GuildUser;
        setMember({ id: userDoc.id, ...userData });

        // Initialize form
        setFullName(userData.fullName || '');
        setPhone(userData.phone || '');
        setAlternatePhone(userData.alternatePhone || '');
        setState(userData.jurisdiction?.stateId || '');
        setCity(userData.jurisdiction?.cityId || '');
        setBranchId(userData.branchId || '');
        setBranchName(userData.branchName || '');
      } catch (err) {
        console.error('Failed to load member data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, currentUser, navigate]);

  // Load branches from Firestore
  useEffect(() => {
    async function loadBranches() {
      if (!canEditBranch) return;
      try {
        const q = query(collection(db, 'guildBranches'), orderBy('name', 'asc'));
        const snap = await getDocs(q);
        const branchList: { id: string; name: string }[] = [];
        snap.docs.forEach(d => {
          branchList.push({ id: d.id, name: String(d.data().name || '') });
        });
        setBranches(branchList);
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    }
    loadBranches();
  }, [canEditBranch]);

  const handleSave = async () => {
    if (!member?.id) return;

    setSaving(true);
    try {
      const updateData: any = {
        fullName,
        phone,
        alternatePhone,
        jurisdiction: {
          stateId: state,
          stateName: STATE_OPTIONS.find(s => s.id === state)?.name || state,
          cityId: city,
          cityName: CITIES_BY_STATE[state]?.find(c => c.id === city)?.name || city,
        },
        updatedAt: new Date().toISOString(),
      };

      // Only admins can change branch
      if (canEditBranch && branchId) {
        updateData.branchId = branchId;
        updateData.branchName = branches.find(b => b.id === branchId)?.name || branchId;
      }

      await updateDoc(doc(db, 'users', member.id), updateData);
      setSaved(true);
      setTimeout(() => {
        navigate(`/members/${member.id}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;
  if (!isOwnerView && !canEditBranch) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[var(--text-muted)]">You don't have permission to edit this profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[var(--text-muted)]">Member not found.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/members')}>
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-4"
            onClick={() => navigate(`/members/${member.id}`)}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Profile
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/60 flex items-center justify-center text-white text-2xl font-black">
              {fullName?.charAt(0) || 'M'}
            </div>
            <div>
              <h1>Edit Profile</h1>
              <p className="text-sm text-[var(--text-muted)]">
                {member.fullName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
          <Save className="w-5 h-5" />
          Profile saved successfully!
        </div>
      )}

      {/* Contact Info */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-6">
          <UserIcon className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-lg font-bold">Personal Information</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input w-full"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              Email (read-only)
            </label>
            <input
              type="email"
              value={member.email || ''}
              disabled
              className="input w-full bg-[var(--card-subtle)] opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Alternate Phone
            </label>
            <input
              type="tel"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              className="input w-full"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
      </div>

      {/* Location (read-only - assigned via branch) */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-6">
          <Building className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-lg font-bold">Location</h2>
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded ml-auto">Read-only (via branch)</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              State (assigned via branch)
            </label>
            <input
              type="text"
              value={STATE_OPTIONS.find(s => s.id === state)?.name || state || ''}
              disabled
              className="input w-full bg-[var(--card-subtle)] opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              City (assigned via branch)
            </label>
            <input
              type="text"
              value={CITIES_BY_STATE[state]?.find(c => c.id === city)?.name || city || ''}
              disabled
              className="input w-full bg-[var(--card-subtle)] opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Branch Assignment (Admin only) */}
      {canEditBranch && (
        <div className="panel">
          <div className="flex items-center gap-2 mb-6">
            <Building className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold">Branch Assignment</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Admin Only</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setBranchName(branches.find(b => b.id === e.target.value)?.name || '');
                }}
                className="input w-full"
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                Current Branch
              </label>
              <div className="input w-full bg-[var(--card-subtle)] flex items-center">
                {branchName || 'Not assigned'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => navigate(`/members/${member.id}`)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}