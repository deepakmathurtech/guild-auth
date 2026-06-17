import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, BriefcaseBusiness, ClipboardCheck, Database, Flag, LayoutDashboard, LogOut, Moon, Shield, Sparkles, Sun, UsersRound, Search, Menu } from 'lucide-react';
import { logout } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { hasRole, roleLabels } from '../lib/rbac';
import { useTheme } from '../context/ThemeContext';
import { NetworkIndicator } from './NetworkIndicator';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from './GlobalSearch';

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

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const mobileNav = nav.filter(item => hasRole(profile?.role, [...item.roles])).slice(0, 5);

  return (
    <div className="shell">
      <NetworkIndicator />
      
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden md:block">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>Guild OS</strong>
            <small>Reception + Ledger</small>
          </div>
        </div>
        <nav>
          {nav.filter((item) => hasRole(profile?.role, [...item.roles])).map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.to === '/'}><Icon size={18} />{item.label}</NavLink>;
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="hidden md:block">
            <p className="eyebrow">Problem &rarr; Revenue &rarr; Knowledge &rarr; Growth</p>
            <h1>{profile?.city ? `${profile.city} Guild Command` : 'Guild Command'}</h1>
          </div>
          
          <div className="md:hidden flex items-center gap-2">
            <span className="brand-mark w-8 h-8 text-sm">G</span>
            <strong>Guild OS</strong>
          </div>

          <div className="top-actions">
            <GlobalSearch />
            <NotificationCenter />
            
            <button className="ghost" type="button" onClick={toggleTheme}>
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} 
              <span className="hidden md:inline ml-1">Theme</span>
            </button>
            
            <span className="role-pill hidden md:inline-flex">{profile?.role ? roleLabels[profile.role] : 'Guest'}</span>
            <button className="ghost hidden md:flex" type="button" onClick={handleLogout}><LogOut size={18} /> Logout</button>
          </div>
        </header>

        <div className="pb-20 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center h-16 z-40">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full text-xs gap-1 ${isActive ? 'text-blue-400' : 'text-gray-400'}`}>
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full h-full text-xs gap-1 text-gray-400 hover:text-red-400">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
