import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useScrollFocusedIntoView } from '../../hooks/useScrollFocusedIntoView';
import { cn } from '../../lib/cn';
import { markScrollRoot } from '../../lib/scrollLock';
import { useSessao } from '../../routes/sessao';
import { FoodHopeLogo } from '../brand/FoodHopeLogo';
import { PainelBottomNav } from './PainelBottomNav';
import { PainelLogoutButton } from './PainelLogoutButton';
import { PainelSidebar } from './PainelSidebar';

function isSubtelaSemBottomNav(pathname: string) {
  return (
    pathname === '/painel/relatorio' ||
    pathname === '/painel/configuracoes/usuarios' ||
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
  const sessao = useSessao();
  const mainRef = useRef<HTMLElement>(null);
  useScrollFocusedIntoView(mainRef);
  const isOperador = sessao.role === 'OPERADOR';
  const semBottomNav = isOperador || isSubtelaSemBottomNav(pathname);

  useEffect(() => {
    markScrollRoot(mainRef.current);
  }, []);

  return (
    <div className="flex min-h-dvh bg-background text-on-background lg:h-dvh lg:overflow-hidden">
      {isOperador ? null : <PainelSidebar role={sessao.role} />}

      <div
        className={cn(
          'relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background shadow-card pt-[env(safe-area-inset-top)]',
          'lg:mx-0 lg:max-w-none lg:flex-1 lg:shadow-none lg:pt-0',
        )}
      >
        <header
          className={cn(
            'flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/50 bg-surface/90 px-4 py-3',
            isOperador ? null : 'lg:hidden',
          )}
        >
          <FoodHopeLogo markClassName="size-7" />
          {isOperador ? <PainelLogoutButton /> : null}
        </header>

        <main
          ref={mainRef}
          data-scroll-root=""
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4',
            'lg:px-8 lg:py-6 lg:pb-6',
            semBottomNav ? MAIN_PB_PLAIN : MAIN_PB_NAV,
            'lg:pb-6',
          )}
        >
          <div className="lg:mx-auto lg:max-w-6xl">
            <Outlet context={sessao} />
          </div>
        </main>

        {semBottomNav ? null : <PainelBottomNav role={sessao.role} />}
      </div>
    </div>
  );
}
