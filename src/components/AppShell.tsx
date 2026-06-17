import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, BriefcaseBusiness, ClipboardCheck, Database, Flag, IndianRupee, LayoutDashboard, LogOut, Menu, Moon, Shield, Sparkles, Sun, UsersRound, X } from 'lucide-react';
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
  { group: 'Operations', to: '/opportunities', label: 'Opportunities', icon: Sparkles, roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Operations', to: '/quests', label: 'Quests', icon: ClipboardCheck, roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Operations', to: '/submissions', label: 'Submissions', icon: ClipboardCheck, roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Closeout', to: '/outcomes', label: 'Outcomes', icon: Shield, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Closeout', to: '/revenue', label: 'Revenue', icon: IndianRupee, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Closeout', to: '/verification', label: 'Verification', icon: Shield, roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Knowledge', to: '/knowledge', label: 'Knowledge', icon: BookOpen, roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Control', to: '/ledger', label: 'Ledger', icon: Database, roles: ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
  { group: 'Control', to: '/admin', label: 'Admin', icon: UsersRound, roles: ['centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] }
] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? 'h-8 w-8' : ''}`}>
      <img src="/guild-logo.png" alt="" className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} object-contain`} />
    </span>
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
    <div className="shell">
      <NetworkIndicator />
      
      <aside className="sidebar hidden md:block">
        <div className="brand">
          <BrandMark />
          <div>
            <strong className="block leading-tight text-lg">Guild OS</strong>
            <small className="text-[var(--muted)] font-bold uppercase text-[10px] tracking-[0.18em]">Command Center</small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group} className="mb-4">
              <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--muted)]">{group}</p>
              <div className="grid gap-1.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={19} aria-hidden="true" />{item.label}</NavLink>;
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--bg)] md:hidden flex flex-col p-6">
           <div className="flex justify-between items-center mb-10">
              <div className="flex gap-4 items-center">
                <BrandMark />
                <div>
                  <strong className="block">Guild OS</strong>
                  <span className="text-xs text-[var(--muted)]">{jurisdictionLabel}</span>
                </div>
              </div>
              <button className="ghost p-2" aria-label="Close navigation" onClick={() => setIsMobileMenuOpen(false)}><X size={24}/></button>
           </div>
           <nav className="grid gap-5 overflow-y-auto" aria-label="Mobile navigation">
              {Object.entries(groupedNav).map(([group, items]) => (
                <div key={group}>
                  <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--muted)]">{group}</p>
                  <div className="grid gap-2">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `flex gap-4 items-center px-4 py-4 rounded-2xl font-bold ${isActive ? 'bg-[#17120b] text-[#f8d987]' : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]'}`}>
                          <Icon size={22} aria-hidden="true" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
           </nav>
           <div className="mt-auto pt-6 border-t border-[var(--border)]">
              <button className="danger w-full py-4" onClick={handleLogout}><LogOut size={20} /> Logout</button>
           </div>
        </div>
      )}

      <main className="main">
        <header className="topbar">
          <div className="hidden md:block">
            <p className="eyebrow">Federation Operational Integrity: High</p>
            <h1>{jurisdictionLabel}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Focused workspace for today&apos;s intake, quest movement, and verification work.</p>
          </div>
          
          <div className="md:hidden flex items-center justify-between w-full">
            <button className="ghost p-2" aria-label="Open navigation" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
            <div className="flex items-center gap-2">
              <BrandMark compact />
              <strong>Guild OS</strong>
            </div>
            <NotificationCenter />
          </div>

          <div className="top-actions hidden md:flex">
            <GlobalSearch />
            <NotificationCenter />
            <button className="ghost" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} 
              <span className="hidden md:inline ml-1">Theme</span>
            </button>
            <span className="role-pill">{profile?.role ? roleLabels[profile.role] : 'Guest'}</span>
            <button className="ghost" type="button" onClick={handleLogout}><LogOut size={18} /> Logout</button>
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
