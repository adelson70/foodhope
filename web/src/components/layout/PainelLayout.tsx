import { Outlet } from 'react-router-dom';

import { PainelBottomNav } from './PainelBottomNav';

export function PainelLayout() {
  return (
    <div className="flex min-h-screen justify-center bg-operator-bg text-on-surface">
      <div className="relative flex w-full max-w-md flex-col min-h-screen overflow-hidden bg-operator-bg shadow-2xl">
        <header className="shrink-0 border-b border-operator-border bg-operator-surface px-4 py-3">
          <p className="text-label-sm uppercase tracking-widest text-primary-container">
            Food Hope
          </p>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <Outlet />
        </main>

        <PainelBottomNav />
      </div>
    </div>
  );
}
