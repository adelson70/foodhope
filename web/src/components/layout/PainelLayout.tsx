import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useScrollFocusedIntoView } from '../../hooks/useScrollFocusedIntoView';
import { cn } from '../../lib/cn';
import { markScrollRoot } from '../../lib/scrollLock';
import { FoodHopeLogo } from '../brand/FoodHopeLogo';
import { PainelBottomNav } from './PainelBottomNav';

function isConfigSubtela(pathname: string) {
  return (
    pathname === '/painel/configuracoes/cozinha' ||
    pathname.startsWith('/painel/configuracoes/cozinha/')
  );
}

const MAIN_PB_NAV =
  'pb-[max(7rem,calc(7rem+env(safe-area-inset-bottom)))]';
const MAIN_PB_PLAIN =
  'pb-[max(1.5rem,calc(1.5rem+env(safe-area-inset-bottom)))]';

export function PainelLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useScrollFocusedIntoView(mainRef);
  const semBottomNav = isConfigSubtela(pathname);

  useEffect(() => {
    markScrollRoot(mainRef.current);
  }, []);

  return (
    <div className="flex min-h-dvh justify-center bg-background text-on-background">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background shadow-card pt-[env(safe-area-inset-top)]">
        <header className="shrink-0 border-b border-outline-variant/50 bg-surface/90 px-4 py-3">
          <FoodHopeLogo markClassName="size-7" />
        </header>

        <main
          ref={mainRef}
          data-scroll-root=""
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4',
            semBottomNav ? MAIN_PB_PLAIN : MAIN_PB_NAV,
          )}
        >
          <Outlet />
        </main>

        {semBottomNav ? null : <PainelBottomNav />}
      </div>
    </div>
  );
}
