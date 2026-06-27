import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncUserLocationFromBranch, getBranchLocation } from '../services/branchService';

import { useAuth } from '../context/AuthContext';
import type { User, GuildUser } from '../types/guild';
import {
  User as UserIcon, Building, ChevronLeft, Phone, Mail,
  Save, X, MapPin, Globe, Sparkles
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
  const [country, setCountry] = useState('');
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
        setBranchId(userData.branchId || '');
        setBranchName(userData.branchName || '');

        // Load location from branch (source of truth)
        if (userData.branchId) {
          const branchLocation = await getBranchLocation(userData.branchId);
          if (branchLocation) {
            setState(branchLocation.stateName || '');
            setCity(branchLocation.cityName || '');
            setCountry(branchLocation.countryName || '');
          } else {
            // Fallback to jurisdiction fields
            setState(userData.jurisdiction?.stateName || userData.jurisdiction?.stateId || '');
            setCity(userData.jurisdiction?.cityName || userData.jurisdiction?.cityId || '');
            setCountry(userData.jurisdiction?.countryName || '');
          }
        } else {
          // No branch - use jurisdiction fields directly
          setState(userData.jurisdiction?.stateName || userData.jurisdiction?.stateId || '');
          setCity(userData.jurisdiction?.cityName || userData.jurisdiction?.cityId || '');
          setCountry(userData.jurisdiction?.countryName || '');
        }
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

  // Fetch location from selected branch (source of truth)
  useEffect(() => {
    async function fetchBranchLocation() {
      if (!branchId) {
        setState('');
        setCity('');
        setCountry('');
        return;
      }

      try {
        const branchLocation = await getBranchLocation(branchId);
        if (branchLocation) {
          setState(branchLocation.stateName || '');
          setCity(branchLocation.cityName || '');
          setCountry(branchLocation.countryName || '');
        }
      } catch (err) {
        console.error('Failed to fetch branch location:', err);
      }
    }
    fetchBranchLocation();
  }, [branchId]);

  const handleSave = async () => {
    if (!member?.id) return;

    setSaving(true);
    try {
      const updateData: any = {
        fullName,
        phone,
        alternatePhone,
        updatedAt: new Date().toISOString(),
      };

      // Only admins can change branch
      if (canEditBranch && branchId) {
        updateData.branchId = branchId;
        updateData.branchName = branches.find(b => b.id === branchId)?.name || branchId;
      }

      await updateDoc(doc(db, 'users', member.id), updateData);

      // If branch changed for staff, force jurisdiction sync from branch
      if (canEditBranch && branchId && updateData.branchId) {
        await syncUserLocationFromBranch({ userId: member.id, branchId: updateData.branchId });
      }

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
    <div className="space-y-8 pb-20">
      {/* Premium Header */}
      <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--card)] via-[var(--bg-alt)] to-[var(--card)] border border-[var(--border)] p-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-500/15 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-cyan-400 transition-colors mb-5"
              onClick={() => navigate(`/members/${member.id}`)}
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Profile
            </button>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-black text-2xl font-black shadow-xl shadow-cyan-500/25">
                {fullName?.charAt(0) || 'M'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">Edit Profile</h1>
                <p className="text-[var(--text-muted)] text-sm mt-1">
                  {member.fullName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {city || 'No city'}
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--border-light)]" />
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {country || 'India'}
            </span>
          </div>
        </div>
      </div>

      {/* Premium Success Message */}
      {saved && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
          <Save className="w-5 h-5" />
          Profile saved successfully!
        </div>
      )}

      {/* Premium Contact Info */}
      <div className="group relative overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-md p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <UserIcon className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Personal Information</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input w-full bg-[var(--input-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-cyan-500/50 focus:ring-cyan-500/20"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Email (read-only)
              </label>
              <input
                type="email"
                value={member.email || ''}
                disabled
                className="input w-full bg-[var(--card-subtle)] border-[var(--border)] text-[var(--text-muted)] opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input w-full bg-[var(--input-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-cyan-500/50 focus:ring-cyan-500/20"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Alternate Phone
              </label>
              <input
                type="tel"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="input w-full bg-[var(--input-bg)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-cyan-500/50 focus:ring-cyan-500/20"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Premium Location (read-only - assigned via branch) */}
      <div className="group relative overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-md p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <Building className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Location</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded ml-auto">Read-only (via branch)</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                State (from branch)
              </label>
              <input
                type="text"
                value={state || ''}
                disabled
                className="input w-full bg-[var(--card-subtle)] border-[var(--border)] text-[var(--text-muted)] opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                City (from branch)
              </label>
              <input
                type="text"
                value={city || ''}
                disabled
                className="input w-full bg-[var(--card-subtle)] border-[var(--border)] text-[var(--text-muted)] opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Country (from branch)
              </label>
              <input
                type="text"
                value={country || ''}
                disabled
                className="input w-full bg-[var(--card-subtle)] border-[var(--border)] text-[var(--text-muted)] opacity-60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Branch Assignment (Admin only) */}
      {canEditBranch && (
        <div className="group relative overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-md p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <Building className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-[var(--text)]">Branch Assignment</h2>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Admin Only</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Branch
                </label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setBranchName(branches.find(b => b.id === e.target.value)?.name || '');
                  }}
                  className="input w-full bg-[var(--input-bg)] border-[var(--border)] text-[var(--text)]"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Current Branch
                </label>
                <div className="input w-full bg-[var(--card-subtle)] border-[var(--border)] text-[var(--text-muted)] flex items-center">
                  {branchName || 'Not assigned'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Actions */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-medium flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => navigate(`/members/${member.id}`)}
          className="px-6 py-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--text-secondary)] font-medium flex items-center gap-2 transition-all hover:bg-[var(--border)]"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}