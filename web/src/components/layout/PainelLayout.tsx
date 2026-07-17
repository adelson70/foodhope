import { Outlet } from 'react-router-dom';

import { PainelBottomNav } from './PainelBottomNav';

export function PainelLayout() {
  return (
    <div className="flex min-h-screen justify-center bg-background text-on-background">
      <div className="relative flex w-full max-w-md flex-col min-h-screen overflow-hidden bg-background shadow-card">
        <header className="shrink-0 border-b border-outline-variant/50 bg-surface/90 px-4 py-3">
          <p className="text-label-sm uppercase tracking-widest text-primary-container">
            Food Hope
          </p>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
          <Outlet />
        </main>

        <PainelBottomNav />
      </div>
    </div>
  );
}
