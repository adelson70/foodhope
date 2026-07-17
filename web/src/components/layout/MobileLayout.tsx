import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useHideOnScrollDown } from '../../hooks/useHideOnScrollDown';
import { useScrollFocusedIntoView } from '../../hooks/useScrollFocusedIntoView';
import { cn } from '../../lib/cn';
import { markScrollRoot } from '../../lib/scrollLock';
import { useCarrinhoStore } from '../../stores/carrinho.store';
import { ensureVisitor } from '../../services/visitor';
import { Button } from '../ui';
import { FoodHopeLogo } from '../brand/FoodHopeLogo';
import { ClienteBottomNav } from './ClienteBottomNav';

function isLegalDoc(pathname: string) {
  return pathname === '/termos' || pathname === '/privacidade';
}

const MAIN_PB_NAV =
  'pb-[max(7rem,calc(7rem+env(safe-area-inset-bottom)))]';
const MAIN_PB_PLAIN =
  'pb-[max(1.5rem,calc(1.5rem+env(safe-area-inset-bottom)))]';

export function MobileAppLayout() {
  const { pathname } = useLocation();
  const hydrate = useCarrinhoStore((state) => state.hydrate);
  const [visitorReady, setVisitorReady] = useState(false);
  const [visitorErro, setVisitorErro] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const navHidden = useHideOnScrollDown(mainRef);
  useScrollFocusedIntoView(mainRef);
  const semBottomNav = isLegalDoc(pathname);

  useEffect(() => {
    markScrollRoot(mainRef.current);
  }, []);

  const iniciarVisitor = useCallback(() => {
    let cancelled = false;
    const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
      /\/$/,
      '',
    );

    setVisitorReady(false);
    setVisitorErro(null);

    if (!baseUrl) {
      setVisitorErro('API não configurada.');
      return () => {
        cancelled = true;
      };
    }

    ensureVisitor(baseUrl)
      .then(async () => {
        if (cancelled) return;
        await hydrate();
        if (!cancelled) {
          setVisitorReady(true);
          setVisitorErro(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVisitorReady(false);
          setVisitorErro('Não foi possível iniciar a sessão do cardápio.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    return iniciarVisitor();
  }, [iniciarVisitor, retryToken]);

  return (
    <div className="flex min-h-dvh justify-center bg-background text-on-background">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background shadow-card pt-[env(safe-area-inset-top)]">
        <header className="sticky top-0 z-20 shrink-0 border-b border-outline-variant/50 bg-surface/90 px-4 py-3 backdrop-blur-sm">
          <FoodHopeLogo
            markClassName="size-8"
            wordmarkClassName="text-title-md tracking-[0.2em]"
          />
        </header>
        <main
          ref={mainRef}
          data-scroll-root=""
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
            semBottomNav ? MAIN_PB_PLAIN : MAIN_PB_NAV,
          )}
        >
          {visitorErro ? (
            <div className="flex flex-col gap-3 p-4">
              <p className="text-body-md text-danger">{visitorErro}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRetryToken((n) => n + 1)}
              >
                Tentar de novo
              </Button>
            </div>
          ) : visitorReady ? (
            <Outlet />
          ) : (
            <div className="flex items-center justify-center p-8">
              <div
                className="size-8 animate-pulse rounded-full bg-primary-container/40"
                aria-label="Iniciando sessão"
              />
            </div>
          )}
        </main>
        {visitorReady && !semBottomNav ? (
          <ClienteBottomNav hidden={navHidden} />
        ) : null}
      </div>
    </div>
  );
}
