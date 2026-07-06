import React from 'react';
import { Info } from 'lucide-react';

export default function ErrorBanner() {
  return (
    <div className="bg-amber-600/90 text-amber-50 text-[11px] font-bold py-1.5 px-4 text-center border-b border-amber-500/30 flex items-center justify-center gap-1.5 animate-pulse">
      <Info className="w-3.5 h-3.5" aria-hidden="true" />
      <span>
        Deployed Demo Mode: Local Client Simulation Active (AI fallbacks engaged, no backend server required).
      </span>
    </div>
  );
}
