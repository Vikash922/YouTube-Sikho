import React from 'react';
import { AlertTriangle, Terminal, ShieldAlert } from 'lucide-react';
import { missingFirebaseKeys, rawFirebaseConfig } from '../../firebase';

export const ConfigErrorScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-red-500/10">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Client Configuration Error</h1>
            <p className="text-xs text-red-400/80">Firebase initialization halted to prevent data leaks</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          The Admin Portal cannot start because critical Firebase environment variables are missing or undefined for this client build.
        </p>

        <div className="mb-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Missing Environment Keys ({missingFirebaseKeys.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {missingFirebaseKeys.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-red-500/10 text-red-300 border border-red-500/30"
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 mb-6 font-mono text-xs text-slate-300">
          <div className="flex items-center gap-2 text-slate-400 mb-2 font-sans font-semibold">
            <Terminal className="w-4 h-4 text-brand-400" />
            <span>How to Resolve:</span>
          </div>
          <p className="text-slate-400 mb-2 font-sans">
            1. Run the client switch script to generate <code className="text-brand-300">admin/.env</code>:
          </p>
          <div className="p-2 rounded bg-slate-900 text-emerald-400 mb-3 select-all">
            node scripts/client-manager.js use &lt;clientName&gt;
          </div>
          <p className="text-slate-400 font-sans">
            2. Make sure you use a <strong>Web App ID</strong> (from Firebase Console &gt; Project Settings &gt; General &gt; Your apps &gt; Web app).
          </p>
        </div>

        <div className="text-xs text-slate-500 flex justify-between items-center pt-4 border-t border-slate-800">
          <span>Project Target: {rawFirebaseConfig.projectId || 'Unspecified'}</span>
          <span>Security Protocol 8.1 Active</span>
        </div>
      </div>
    </div>
  );
};
