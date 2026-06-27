import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen, BriefcaseBusiness, ClipboardCheck, Database, Flag,
  IndianRupee, LayoutDashboard, LogOut, Menu, Moon, Shield,
  Sparkles, Sun, UsersRound, User, X, MapPin, Network
} from 'lucide-react';
import { logout } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { hasRole, roleLabels } from '../lib/rbac';
import { useTheme } from '../context/ThemeContext';
import { getBranchLocation } from '../services/branchService';
import { NetworkIndicator } from './NetworkIndicator';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from './GlobalSearch';

const nav = [
  { group: 'Command', to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['applicant', 'member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Intake', to: '/organizations', label: 'Organizations', icon: BriefcaseBusiness, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Intake', to: '/needs', label: 'Needs', icon: Flag, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Intake', to: '/members', label: 'Members', icon: UsersRound, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Intake', to: '/profile', label: 'My Profile', icon: User, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Operations', to: '/opportunities', label: 'Opportunities', icon: Sparkles, roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Operations', to: '/quests', label: 'Quests', icon: ClipboardCheck, roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Operations', to: '/submissions', label: 'Submissions', icon: ClipboardCheck, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Closeout', to: '/outcomes', label: 'Outcomes', icon: Shield, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Closeout', to: '/revenue', label: 'Revenue', icon: IndianRupee, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Closeout', to: '/verification', label: 'Verification', icon: Shield, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Knowledge', to: '/knowledge', label: 'Knowledge', icon: BookOpen, roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Control', to: '/ledger', label: 'Ledger', icon: Database, roles: ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Control', to: '/branches', label: 'Branches', icon: MapPin, roles: ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Control', to: '/branches-hierarchy', label: 'Branch Network', icon: Network, roles: ['guildFounder', 'founder'] },
  { group: 'Control', to: '/admin', label: 'Admin', icon: UsersRound, roles: ['centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] }
] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-xl bg-black border border-[var(--primary)]/35 shadow-sm ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
      <img src="/guild-logo.png" alt="" className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} object-contain`} />
    </div>
  );
}

export function AppShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false);

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  function closeMobileMenu() {
    setIsMobileMenuClosing(true);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsMobileMenuClosing(false);
    }, 200);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Branch location (source of truth)
  const [branchLocation, setBranchLocation] = useState<{cityName?: string; stateName?: string} | null>(null);

  useEffect(() => {
    async function loadBranchLocation() {
      if (!profile?.branchId) return;
      try {
        const location = await getBranchLocation(profile.branchId);
        if (location) {
          setBranchLocation({ cityName: location.cityName, stateName: location.stateName });
        }
      } catch (err) {
        console.error('Failed to load branch location:', err);
      }
    }
    loadBranchLocation();
  }, [profile?.branchId]);

  const allowedNav = nav.filter((item) => hasRole(profile?.role, [...item.roles] as any));
  const groupedNav = allowedNav.reduce<Record<string, typeof allowedNav>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] || []), item];
    return groups;
  }, {});

  // Use branch location as source of truth, fallback to jurisdiction
  const jurisdictionLabel = branchLocation?.cityName
    ? `${branchLocation.cityName}, ${branchLocation.stateName}`
    : profile?.jurisdiction?.cityName
      ? `${profile.jurisdiction.cityName}, ${profile.jurisdiction.stateName}`
      : 'National Command';

  return (
    <div className="shell bg-[var(--bg)] text-[var(--text)]">
      <NetworkIndicator />
      
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden lg:flex flex-col w-[260px]">
        <div className="flex items-center gap-3 mb-8 px-2">
          <BrandMark />
          <div>
            <strong className="block text-sm font-bold tracking-tight">The Central Guild</strong>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Guild OS</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group}>
              <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) => `
                        group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-[var(--card-subtle)] text-[var(--text)] ring-1 ring-[var(--border-light)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-subtle)]/50'}
                      `}
                    >
                      <span className={`absolute left-0 h-5 w-0.5 rounded-full bg-[var(--primary)] transition-opacity ${item.to === window.location.pathname ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                      <Icon className={`w-4 h-4 ${item.to === window.location.pathname ? 'text-[var(--primary)]' : ''}`} aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-[var(--border)] px-2">
          <button onClick={() => navigate('/profile')} className="flex items-center gap-3 p-2 rounded-xl bg-[var(--card-subtle)]/50 mb-3 w-full text-left hover:bg-[var(--card-subtle)] transition-colors">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-xs font-bold">
              {profile?.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{profile?.fullName}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{profile?.role ? roleLabels[profile.role] : 'Member'}</p>
            </div>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors">
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 z-50 md:hidden flex flex-col ${isMobileMenuClosing ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'} transition-all duration-300 ease-out`}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobileMenu} aria-hidden="true" />

          {/* Slide-in Panel */}
          <div className={`absolute right-0 top-0 bottom-0 w-[min(85vw,320px)] bg-[var(--bg)] shadow-2xl flex flex-col ${isMobileMenuClosing ? 'translate-x-full' : 'translate-x-0'} transition-transform duration-300 ease-out`}>
            <div className="flex justify-between items-center p-6 border-b border-[var(--border)]">
              <div className="flex gap-3 items-center">
                <BrandMark />
                <div>
                  <strong className="block font-bold">The Central Guild</strong>
                  <span className="text-xs text-[var(--text-muted)]">{jurisdictionLabel}</span>
                </div>
              </div>
              <button className="icon-button !h-10 !w-10" onClick={closeMobileMenu} aria-label="Close menu">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--card-subtle)]">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-sm font-bold">
                  {profile?.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{profile?.fullName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{profile?.role ? roleLabels[profile.role] : 'Member'}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
              {Object.entries(groupedNav).map(([group, items]) => (
                <div key={group} className="mb-6">
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{group}</p>
                  <div className="grid gap-1.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          onClick={closeMobileMenu}
                          className={({isActive}) => `
                            flex gap-3 items-center px-4 py-3.5 rounded-xl font-semibold text-sm transition-all min-h-[48px]
                            ${isActive ? 'bg-[var(--primary)] text-black shadow-lg shadow-[var(--primary)]/20' : 'text-[var(--text-secondary)] hover:bg-[var(--card-subtle)] hover:text-[var(--text)]'}
                          `}
                        >
                          <Icon className="w-5 h-5" aria-hidden="true" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-[var(--border)] space-y-2">
              <button className="w-full py-3.5 rounded-xl bg-[var(--card-subtle)] text-[var(--text-secondary)] font-semibold flex items-center justify-center gap-2" onClick={toggleTheme}>
                {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button className="w-full py-3.5 rounded-xl bg-[var(--error)]/10 text-[var(--error)] font-bold flex items-center justify-center gap-2" onClick={handleLogout}>
                <LogOut className="w-5 h-5" aria-hidden="true" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-14 lg:h-16 mb-6 lg:mb-8 shrink-0">
          {/* Desktop: Show location + status */}
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold tracking-tight">{jurisdictionLabel}</h1>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              Operational Integrity: High
            </div>
          </div>

          {/* Tablet: Show location only */}
          <div className="hidden md:block lg:hidden">
            <h1 className="text-lg font-bold tracking-tight">{jurisdictionLabel}</h1>
          </div>

          {/* Mobile: Show hamburger + logo */}
          <div className="md:hidden flex items-center justify-between w-full">
            <button className="icon-button !h-11 !w-11 touch-manipulation" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <BrandMark compact />
              <strong className="text-sm font-bold">Guild OS</strong>
            </div>
            <NotificationCenter />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <GlobalSearch />
            <div className="h-5 w-px bg-[var(--border)] mx-1 lg:mx-2" />
            <NotificationCenter />
            <button
              className="icon-button"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            </button>
            <div className="role-chip">
              <Shield className="w-3 h-3" aria-hidden="true" />
              {profile?.role ? roleLabels[profile.role] : 'Guest'}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="animate-fade-up">
            <Outlet />
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
      `}</style>
    </div>
  );
}
