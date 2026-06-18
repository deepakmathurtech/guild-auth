import { FormEvent, useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../lib/auth';
import type { Jurisdiction } from '../types/guild';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES } from '../lib/jurisdiction';
import { isUserActive } from '../lib/rbac';
import { ChevronRight, ArrowLeft, ShieldCheck, MapPin, Sparkles, User, Mail, Lock, Phone, Star } from 'lucide-react';
import Particles from '../components/Particles';

export function LoginPage() {
  const { profile, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stateName, setStateName] = useState('Punjab');
  const [cityName, setCityName] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInteractions] = useState('');
  const [phone, setPhone] = useState('');
  const [availability, setAvailability] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [preferredRole, setPreferredRole] = useState('');
  const [referralSource, setReferralSource] = useState('');

  const [indicator, setIndicator] = useState({ width: 0, left: 0 });
  const loginRef = useRef<HTMLButtonElement>(null);
  const registerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ref = mode === 'login' ? loginRef.current : registerRef.current;
    if (ref) {
      setIndicator({ width: ref.offsetWidth, left: ref.offsetLeft });
    }
  }, [mode]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
    </div>
  );

  if (profile && isUserActive(profile)) return <Navigate to="/" replace />;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!fullName || !email || !password || !cityName) {
      setError('Required: Name, Email, Password, and City.');
      return;
    }
    if (password.length < 6) {
      setError('Security: Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const stateObj = INDIAN_STATES.find(s => s.name === stateName)!;
      const jurisdiction: Jurisdiction = {
        countryId: 'india',
        countryName: 'India',
        stateId: stateObj.id,
        stateName: stateObj.name,
        cityId: cityName.toLowerCase().trim().substring(0, 3),
        cityName: cityName.trim()
      };
      
      await registerWithEmail(
        email.trim(), 
        password, 
        fullName.trim(), 
        jurisdiction, 
        skills.split(',').map(s => s.trim()).filter(Boolean), 
        interests.split(',').map(i => i.trim()).filter(Boolean),
        {
          phone: phone.trim(),
          availability: availability.trim(),
          emergencyContact: emergencyContact.trim(),
          preferredRole: preferredRole.trim(),
          referralSource: referralSource.trim()
        }
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: <ShieldCheck className="w-4 h-4" />, text: 'Role-based access control' },
    { icon: <Sparkles className="w-4 h-4" />, text: 'National Scale Operating System' },
    { icon: <MapPin className="w-4 h-4" />, text: 'Decentralized Jurisdiction' },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[var(--bg)]">
      <Particles />
      
      {/* Ambient Glows */}
      <div className="fixed w-[600px] h-[600px] rounded-full pointer-events-none -top-[200px] -left-[200px] opacity-20 z-0 bg-[var(--glow-gold)] blur-[120px]" />
      <div className="fixed w-[500px] h-[500px] rounded-full pointer-events-none -bottom-[150px] -right-[150px] opacity-10 z-0 bg-[var(--glow-purple)] blur-[120px]" />

      <main className="relative z-10 grid grid-cols-1 md:grid-cols-2 max-w-[1000px] w-full rounded-[2.5rem] overflow-hidden shadow-[var(--shadow-lg)] border border-[var(--border)] animate-fade-up">
        
        {/* Brand Panel */}
        <div className="bg-[var(--bg-alt)] p-10 md:p-12 flex flex-col justify-center relative overflow-hidden border-r border-[var(--border)]">
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            background: 'radial-gradient(circle at 20% 50%, var(--glow-gold) 0%, transparent 60%)'
          }} />
          
          <div className="relative z-10 mb-8">
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-[var(--primary)] text-2xl font-bold shadow-xl border border-[var(--primary)]/20">
              G
            </div>
          </div>

          <h1 className="relative z-10 text-4xl font-bold tracking-tight leading-[1.1] mb-4">
            Welcome to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent-light)]">
              The Central Guild
            </span>
          </h1>
          
          <p className="relative z-10 text-[var(--text-secondary)] text-base mb-10 max-w-[320px] leading-relaxed">
            Your premium operating system for managing guild operations, jurisdictions, and member verification.
          </p>

          <div className="relative z-10 space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4 text-[var(--text-secondary)] animate-slide-in" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--primary)]">
                  {f.icon}
                </span>
                <span className="text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-auto pt-10 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            &copy; 2026 GUILD OS PORTAL. ALL RIGHTS RESERVED.
          </div>
        </div>

        {/* Form Panel */}
        <div className="bg-[var(--card-glass)] backdrop-blur-2xl p-10 md:p-12 flex flex-col justify-center">
          
          {/* Tabs */}
          <div className="relative flex gap-8 mb-8 border-b border-[var(--border)] pb-2">
            <button 
              ref={loginRef}
              onClick={() => { setMode('login'); setError(''); }}
              className={`pb-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
            >
              Sign In
            </button>
            <button 
              ref={registerRef}
              onClick={() => { setMode('register'); setError(''); setStep(1); }}
              className={`pb-2 text-sm font-semibold transition-colors ${mode === 'register' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
            >
              Apply for Membership
            </button>
            <span 
              className="absolute bottom-[-1px] h-0.5 bg-[var(--primary)] transition-all duration-300"
              style={{ width: indicator.width, left: indicator.left }}
            />
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in duration-500">
              <div>
                <h2 className="text-xl font-bold mb-1">Return to Post</h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">Authenticate to access the command center.</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@guild.com" 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Password
                  </label>
                  <button type="button" className="text-[11px] text-[var(--primary)] hover:underline">Forgot password?</button>
                </div>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
              </div>

              {error && <p className="text-[var(--error)] text-xs font-medium bg-[var(--error)]/10 p-3 rounded-lg border border-[var(--error)]/20">{error}</p>}
              
              <button className="primary w-full py-3.5 mt-2" type="submit" disabled={loading}>
                {loading ? 'Authenticating...' : 'Access Command Center'}
              </button>

              <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] py-2">
                <div className="h-px flex-1 bg-[var(--border)]" />
                OR CONTINUE WITH
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <button className="secondary w-full py-3" type="button" onClick={loginWithGoogle}>
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 opacity-70" alt="" />
                Google Workspace
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-bold mb-1">Guild Application</h2>
                  <p className="text-sm text-[var(--text-muted)]">Step {step} of 3</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`h-1 w-6 rounded-full transition-all ${step >= s ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                  ))}
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                      <User className="w-3 h-3" /> Full Legal Name
                    </label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter full name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Email
                    </label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                        <Phone className="w-3 h-3" /> Phone
                      </label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 ..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                        <Lock className="w-3 h-3" /> Password
                      </label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 chars" />
                    </div>
                  </div>
                  <button className="primary w-full py-3.5 mt-4" onClick={() => setStep(2)}>
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Jurisdiction: State
                    </label>
                    <select value={stateName} onChange={e => setStateName(e.target.value)}>
                      {INDIAN_STATES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Jurisdiction: City
                    </label>
                    <input value={cityName} onChange={e => setCityName(e.target.value)} placeholder="e.g. Ludhiana, Mumbai, Chennai" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button className="secondary flex-1 py-3.5" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button className="primary flex-[2] py-3.5" onClick={() => setStep(3)}>
                      Final Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <form onSubmit={handleRegister} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Skills
                      </label>
                      <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Sales" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                        <Star className="w-3 h-3" /> Interests
                      </label>
                      <input value={interests} onChange={e => setInteractions(e.target.value)} placeholder="Tech, Art" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Availability</label>
                    <input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="e.g. 20 hours/week" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Preferred Role</label>
                      <input value={preferredRole} onChange={e => setPreferredRole(e.target.value)} placeholder="e.g. Developer" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Emergency</label>
                      <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="Name & Phone" />
                    </div>
                  </div>

                  {error && <p className="text-[var(--error)] text-xs font-medium bg-[var(--error)]/10 p-3 rounded-lg border border-[var(--error)]/20">{error}</p>}
                  
                  <div className="flex gap-3 pt-4">
                    <button className="secondary flex-1 py-3.5" type="button" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button className="primary flex-[2] py-3.5" type="submit" disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-8 text-center text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.3em] pointer-events-none">
        Secure Communication Channel Established
      </div>
    </div>
  );
}
