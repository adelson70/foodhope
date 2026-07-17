import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useHideOnScrollDown } from '../../hooks/useHideOnScrollDown';
import { cn } from '../../lib/cn';
import { PainelBottomNav } from './PainelBottomNav';

function isConfigSubtela(pathname: string) {
  return pathname === '/painel/configuracoes/cozinha';
}

export function PainelLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const navHidden = useHideOnScrollDown(mainRef);
  const semBottomNav = isConfigSubtela(pathname);

  return (
    <div className="flex min-h-dvh justify-center bg-background text-on-background">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background shadow-card">
        <header className="shrink-0 border-b border-outline-variant/50 bg-surface/90 px-4 py-3">
          <p className="text-label-sm uppercase tracking-widest text-primary-container">
            Food Hope
          </p>
        </header>

        <main
          ref={mainRef}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-4 py-4',
            semBottomNav ? 'pb-6' : 'pb-28',
          )}
        >
          <Outlet />
        </main>

        {semBottomNav ? null : <PainelBottomNav hidden={navHidden} />}
      </div>
    </div>
  );
}
