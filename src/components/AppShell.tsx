import { useState } from 'react';
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

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const allowedNav = nav.filter((item) => hasRole(profile?.role, [...item.roles] as any));
  const groupedNav = allowedNav.reduce<Record<string, typeof allowedNav>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] || []), item];
    return groups;
  }, {});

  const jurisdictionLabel = profile?.jurisdiction.cityName
    ? `${profile.jurisdiction.cityName}, ${profile.jurisdiction.stateName}`
    : 'National Command';

  return (
    <div className="shell bg-[var(--bg)] text-[var(--text)]">
      <NetworkIndicator />
      
      {/* Sidebar */}
      <aside className="sidebar hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
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
                        group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
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
          <button onClick={() => navigate('/profile')} className="flex items-center gap-3 p-2 rounded-xl bg-[var(--card-subtle)]/50 mb-4 w-full text-left hover:bg-[var(--card-subtle)] transition-colors">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-xs font-bold">
              {profile?.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{profile?.fullName}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{profile?.role ? roleLabels[profile.role] : 'Member'}</p>
            </div>
            <button onClick={handleLogout} className="icon-button !h-8 !w-8 !bg-transparent hover:!bg-[var(--error)]/10 hover:!text-[var(--error)]" aria-label="Log out">
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--bg)] md:hidden flex flex-col p-6 animate-in fade-in duration-200">
           <div className="flex justify-between items-center mb-10">
              <div className="flex gap-4 items-center">
                <BrandMark />
                <div>
                  <strong className="block font-bold">The Central Guild</strong>
                  <span className="text-xs text-[var(--text-muted)]">{jurisdictionLabel}</span>
                </div>
              </div>
              <button className="icon-button !h-11 !w-11" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
           </div>
           <nav className="flex-1 overflow-y-auto space-y-8 pb-10 pr-2 custom-scrollbar">
              {Object.entries(groupedNav).map(([group, items]) => (
                <div key={group}>
                  <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{group}</p>
                  <div className="grid gap-2">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink 
                          key={item.to} 
                          to={item.to} 
                          end={item.to === '/'} 
                          onClick={() => setIsMobileMenuOpen(false)} 
                          className={({isActive}) => `
                            flex gap-4 items-center px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all
                            ${isActive ? 'bg-[var(--primary)] text-black shadow-lg shadow-[var(--primary)]/20' : 'bg-[var(--card-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'}
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
           <button className="w-full py-4 rounded-2xl bg-[var(--error)]/10 text-[var(--error)] font-bold flex items-center justify-center gap-2" onClick={handleLogout}>
            <LogOut className="w-5 h-5" aria-hidden="true" /> Logout
           </button>
        </div>
      )}

      {/* Main Content */}
      <main className="main flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-16 mb-8 shrink-0">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold tracking-tight">{jurisdictionLabel}</h1>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              Operational Integrity: High
            </div>
          </div>
          
          <div className="md:hidden flex items-center justify-between w-full">
            <button className="icon-button !h-11 !w-11" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <BrandMark compact />
              <strong className="text-sm font-bold">Guild OS</strong>
            </div>
            <NotificationCenter />
          </div>

          <div className="hidden md:flex items-center gap-3">
            <GlobalSearch />
            <div className="h-6 w-px bg-[var(--border)] mx-2" />
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
