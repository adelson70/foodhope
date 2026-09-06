import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAppPullToRefresh } from '../../hooks/useAppPullToRefresh';
import { usePedidoOutboxSync } from '../../hooks/usePedidoOutboxSync';
import { useScrollFocusedIntoView } from '../../hooks/useScrollFocusedIntoView';
import { cn } from '../../lib/cn';
import { isNetworkFailure } from '../../lib/network';
import { markScrollRoot } from '../../lib/scrollLock';
import {
  obterSessaoOperador,
  salvarSessaoOperador,
} from '../../lib/sessaoOperador';
import { useCarrinhoStore } from '../../stores/carrinho.store';
import { ensureVisitor } from '../../services/visitor';
import { authService, getToken } from '../../services';
import { Button, Loading } from '../ui';
import { FoodHopeLogo } from '../brand/FoodHopeLogo';
import { ClienteBottomNav } from './ClienteBottomNav';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

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
  const [isTotem, setIsTotem] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useScrollFocusedIntoView(mainRef);
  const pull = useAppPullToRefresh(mainRef, visitorReady && !visitorErro);
  const semBottomNav = isLegalDoc(pathname);
  usePedidoOutboxSync(isTotem && Boolean(getToken()));

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

    if (getToken()) {
      authService
        .me()
        .then((response) => {
          if (cancelled) return;
          setIsTotem(response.dados?.role === 'TOTEM');
          if (response.dados) {
            void salvarSessaoOperador(response.dados);
          }
        })
        .catch(async (error: unknown) => {
          if (cancelled) return;
          if (isNetworkFailure(error)) {
            const cache = await obterSessaoOperador();
            if (cache?.role === 'TOTEM' && getToken()) {
              setIsTotem(true);
              return;
            }
          }
          setIsTotem(false);
        })
        .finally(async () => {
          await hydrate();
          if (!cancelled) setVisitorReady(true);
        });

      return () => {
        cancelled = true;
      };
    }

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
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/50 bg-surface/90 px-4 py-3 backdrop-blur-sm">
          <FoodHopeLogo
            markClassName="size-8"
            wordmarkClassName="text-title-md tracking-[0.2em]"
          />
        </header>
        <main
          ref={mainRef}
          data-scroll-root=""
          className={cn(
            'relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
            semBottomNav ? MAIN_PB_PLAIN : MAIN_PB_NAV,
          )}
        >
          <PullToRefreshIndicator
            pullDistance={pull.pullDistance}
            refreshing={pull.refreshing}
            armed={pull.armed}
          />
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
            <Outlet context={{ isTotem }} />
          ) : (
            <Loading label="Iniciando sessão" />
          )}
        </main>
        {visitorReady && !semBottomNav ? (
          <ClienteBottomNav isTotem={isTotem} />
        ) : null}
      </div>
    </div>
  );
}
