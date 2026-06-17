import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, BriefcaseBusiness, ClipboardCheck, Database, Flag, LayoutDashboard, LogOut, Moon, Shield, Sparkles, Sun, UsersRound, Menu, X } from 'lucide-react';
import { logout } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { hasRole, roleLabels } from '../lib/rbac';
import { useTheme } from '../context/ThemeContext';
import { NetworkIndicator } from './NetworkIndicator';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from './GlobalSearch';
import { useState } from 'react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['member', 'contributor', 'receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/organizations', label: 'Organizations', icon: BriefcaseBusiness, roles: ['receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/needs', label: 'Needs', icon: Flag, roles: ['receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/opportunities', label: 'Opportunities', icon: Sparkles, roles: ['member', 'contributor', 'receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/quests', label: 'Quests', icon: ClipboardCheck, roles: ['member', 'contributor', 'receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/submissions', label: 'Submissions', icon: ClipboardCheck, roles: ['member', 'contributor', 'receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/outcomes', label: 'Outcomes', icon: Shield, roles: ['receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/revenue', label: 'Revenue', icon: BriefcaseBusiness, roles: ['receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/verification', label: 'Verification', icon: Shield, roles: ['receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/ledger', label: 'Ledger', icon: Database, roles: ['guildManager', 'guildAdmin'] },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen, roles: ['member', 'contributor', 'receptionist', 'guildManager', 'guildAdmin'] },
  { to: '/admin', label: 'Admin', icon: UsersRound, roles: ['guildAdmin'] }
] as const;

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

  const allowedNav = nav.filter((item) => hasRole(profile?.role, [...item.roles]));

  return (
    <div className="shell">
      <NetworkIndicator />
      
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden md:block">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <strong className="block leading-tight text-lg">Guild OS</strong>
            <small className="text-[var(--muted)] font-bold uppercase text-[10px] tracking-tighter">Human Network Ledger</small>
          </div>
        </div>
        <nav>
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({isActive}) => isActive ? 'active' : ''}><Icon size={20} />{item.label}</NavLink>;
          })}
        </nav>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--bg)] md:hidden flex flex-col p-6 animate-in slide-in-from-left duration-300">
           <div className="flex justify-between items-center mb-10">
              <div className="flex gap-4 items-center">
                <span className="brand-mark">G</span>
                <strong>Guild OS</strong>
              </div>
              <button className="ghost p-2" onClick={() => setIsMobileMenuOpen(false)}><X size={24}/></button>
           </div>
           <nav className="grid gap-2 overflow-y-auto">
              {allowedNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setIsMobileMenuOpen(false)} className={({isActive}) => `flex gap-4 items-center px-4 py-4 rounded-xl font-bold ${isActive ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)]'}`}>
                    <Icon size={24} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
           </nav>
           <div className="mt-auto pt-6 border-t border-[var(--border)]">
              <button className="danger w-full py-4" onClick={handleLogout}><LogOut size={20} /> Logout</button>
           </div>
        </div>
      )}

      <main className="main">
        <header className="topbar">
          <div className="hidden md:block">
            <p className="eyebrow">Operational Readiness: High &middot; {profile?.role}</p>
            <h1>{profile?.city ? `${profile.city} Command` : 'Command'}</h1>
          </div>
          
          <div className="md:hidden flex items-center justify-between w-full">
            <button className="ghost p-2" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
            <div className="flex items-center gap-2">
              <span className="brand-mark w-8 h-8 text-sm">G</span>
              <strong>Guild OS</strong>
            </div>
            <NotificationCenter />
          </div>

          <div className="top-actions hidden md:flex">
            <GlobalSearch />
            <NotificationCenter />
            
            <button className="ghost" type="button" onClick={toggleTheme}>
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
