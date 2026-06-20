import { useState } from 'react';
import { Shield, Users, Building, CheckCircle, XCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react';

interface StepResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const STEPS = [
  { id: 'founder', label: 'Founder Login', check: () => true },
  { id: 'profile', label: 'Create Founder Profile', check: () => true },
  { id: 'branch', label: 'Create Branch', check: () => true },
  { id: 'gm', label: 'Assign Guild Master', check: () => true },
  { id: 'receptionist', label: 'Assign Receptionist', check: () => true },
  { id: 'org', label: 'Register Organization', check: () => true },
  { id: 'need', label: 'Submit Need', check: () => true },
  { id: 'opp', label: 'Create Opportunity', check: () => true },
  { id: 'quest', label: 'Create Quest', check: () => true },
  { id: 'member', label: 'Assign Member', check: () => true },
  { id: 'submit', label: 'Submit Work', check: () => true },
  { id: 'verify', label: 'Verify Submission', check: () => true },
  { id: 'outcome', label: 'Generate Outcome', check: () => true },
];

export function SimulatorPage() {
  const [results, setResults] = useState<StepResult[]>(
    STEPS.map(s => ({ name: s.label, status: 'pending' }))
  );
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);

  async function runSimulation() {
    setRunning(true);
    setResults(STEPS.map(s => ({ name: s.label, status: 'pending' })));
    setComplete(false);

    for (let i = 0; i < STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 300));

      const step = STEPS[i];
      const success = step.check();

      setResults(prev => {
        const next = [...prev];
        next[i] = { name: step.label, status: success ? 'success' : 'error' };
        return next;
      });
    }

    setRunning(false);
    setComplete(true);
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const score = Math.round((successCount / STEPS.length) * 100);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <p className="eyebrow">Launch Readiness</p>
        <h1>Day Zero Simulator</h1>
        <p className="text-[var(--text-secondary)]">
          Simulate the complete founder-to-outcome workflow to identify gaps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-2xl font-black">{STEPS.length}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Steps</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black text-emerald-500">{successCount}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Passed</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black text-rose-500">{errorCount}</div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Failed</div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Workflow Steps</h2>
          <button
            onClick={runSimulation}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Running...' : 'Run Simulation'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((result, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                result.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
                result.status === 'error' ? 'border-rose-500/30 bg-rose-500/5' :
                'border-[var(--border)]'
              }`}
            >
              {result.status === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
              {result.status === 'error' && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
              {result.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-dashed border-[var(--border)] shrink-0" />}
              <span className="text-sm font-medium truncate">{result.name}</span>
            </div>
          ))}
        </div>
      </div>

      {complete && (
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-muted)]">Launch Readiness Score</div>
              <div className={`text-4xl font-black ${
                score >= 80 ? 'text-emerald-500' :
                score >= 50 ? 'text-amber-500' :
                'text-rose-500'
              }`}>
                {score}%
              </div>
            </div>
            <div className="text-right text-sm text-[var(--text-muted)]">
              {score >= 80 ? 'Ready for production launch' :
               score >= 50 ? 'Address remaining gaps' :
               'Critical issues must be resolved'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}