import { FormEvent, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../lib/auth';
import type { Jurisdiction } from '../types/guild';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES } from '../lib/jurisdiction';
import { ChevronRight, ArrowLeft, ShieldCheck, MapPin, Sparkles, User, Mail } from 'lucide-react';

export function LoginPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stateName, setStateName] = useState('Punjab');
  const [cityName, setCityName] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInteractions] = useState('');

  if (profile) return <Navigate to="/" replace />;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const stateObj = INDIAN_STATES.find(s => s.name === stateName)!;
      const jurisdiction: Jurisdiction = {
        countryId: 'india',
        countryName: 'India',
        stateId: stateObj.id,
        stateName: stateObj.name,
        cityId: cityName.toLowerCase().substring(0, 3),
        cityName: cityName
      };
      
      await registerWithEmail(
        email, 
        password, 
        fullName, 
        jurisdiction, 
        skills.split(',').map(s => s.trim()), 
        interests.split(',').map(i => i.trim())
      );
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 to-blue-950">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl grid place-items-center text-3xl font-black mx-auto mb-4 shadow-xl shadow-blue-600/20">G</div>
           <h1 className="text-white text-3xl font-black">Guild Federation</h1>
           <p className="text-blue-200/50 uppercase tracking-widest text-[10px] font-bold mt-2">National Scale Operating System</p>
        </div>

        <section className="bg-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-2xl font-bold mb-6">Welcome Back</h2>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@guild.com" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                <button className="primary w-full py-4 text-base" type="submit">Access Command Center</button>
                <button className="ghost w-full py-4" type="button" onClick={loginWithGoogle}>Continue with Google</button>
                <button className="w-full text-sm font-bold text-slate-500 mt-4" type="button" onClick={() => setMode('register')}>Apply for Guild Membership &rarr;</button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-2xl font-bold">Registration</h2>
                   <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black uppercase">Step {step} / 3</span>
                </div>

                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400">Full Legal Name</label>
                      <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter full name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400">Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400">Password (Min 6 chars)</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button className="primary w-full py-4 mt-4" onClick={() => setStep(2)}>Next Step <ChevronRight size={18}/></button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400">Jurisdiction: State</label>
                      <select value={stateName} onChange={e => setStateName(e.target.value)}>
                        {INDIAN_STATES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400">Jurisdiction: City</label>
                      <input value={cityName} onChange={e => setCityName(e.target.value)} placeholder="e.g. Ludhiana, Mumbai, Chennai" />
                    </div>
                    <div className="flex gap-2">
                      <button className="ghost flex-1 py-4" onClick={() => setStep(1)}><ArrowLeft size={18}/> Back</button>
                      <button className="primary flex-[2] py-4" onClick={() => setStep(3)}>Final Details <ChevronRight size={18}/></button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400">Skills (Comma separated)</label>
                      <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Content Writing, Sales" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400">Interests</label>
                      <input value={interests} onChange={e => setInteractions(e.target.value)} placeholder="Technology, Social Work" />
                    </div>
                    {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                    <div className="flex gap-2">
                      <button className="ghost flex-1 py-4" type="button" onClick={() => setStep(2)}><ArrowLeft size={18}/> Back</button>
                      <button className="primary flex-[2] py-4" type="submit">Submit Application</button>
                    </div>
                  </form>
                )}
                
                <button className="w-full text-sm font-bold text-slate-500 mt-4" type="button" onClick={() => setMode('login')}>Already have an account? Login &rarr;</button>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        </section>
        <p className="text-center text-blue-200/30 text-[10px] font-bold uppercase mt-8 tracking-tighter">Guild Federation Security Protocol Active</p>
      </div>
    </main>
  );
}
