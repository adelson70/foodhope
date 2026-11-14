import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';

import { useAppPullToRefresh } from '../../hooks/useAppPullToRefresh';
import { useOnReconnect } from '../../hooks/useOnReconnect';
import {
  useOnlineStatus,
  usePedidoOutboxSync,
} from '../../hooks/usePedidoOutboxSync';
import { useScrollFocusedIntoView } from '../../hooks/useScrollFocusedIntoView';
import { cn } from '../../lib/cn';
import {
  isAppOffline,
  liberarRetryApi,
  marcarApiInalcancavel,
} from '../../lib/conectividade';
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

function apiBaseUrl(): string | undefined {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
}

/** fetch sem rede gera TypeError; página de erro da Cloudflare (HTML) gera SyntaxError no .json(). */
function isFalhaDeRedeVisitor(error: unknown): boolean {
  return (
    isAppOffline() ||
    isNetworkFailure(error) ||
    error instanceof TypeError ||
    error instanceof SyntaxError
  );
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
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  usePedidoOutboxSync(isTotem && Boolean(getToken()));

  useEffect(() => {
    markScrollRoot(mainRef.current);
  }, []);

  const iniciarVisitor = useCallback(() => {
    let cancelled = false;
    const baseUrl = apiBaseUrl();

    setVisitorReady(false);
    setVisitorErro(null);

    if (getToken()) {
      void (async () => {
        const cache = await obterSessaoOperador();
        if (cancelled) return;

        if (cache?.role === 'TOTEM') {
          setIsTotem(true);
        }

        if (isAppOffline()) {
          await hydrate();
          if (!cancelled) setVisitorReady(true);
          return;
        }

        try {
          const response = await authService.me();
          if (cancelled) return;
          setIsTotem(response.dados?.role === 'TOTEM');
          if (response.dados) {
            void salvarSessaoOperador(response.dados);
          }
        } catch (error: unknown) {
          if (cancelled) return;
          if (isNetworkFailure(error)) {
            const sessao = cache ?? (await obterSessaoOperador());
            if (sessao?.role === 'TOTEM' && getToken()) {
              setIsTotem(true);
            } else {
              setIsTotem(false);
            }
          } else {
            setIsTotem(false);
          }
        } finally {
          await hydrate();
          if (!cancelled) setVisitorReady(true);
        }
      })();

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
      .catch(async (error: unknown) => {
        if (cancelled) return;
        if (isFalhaDeRedeVisitor(error)) {
          // Sem rede: abre com os dados locais; a sessão é criada ao reconectar.
          marcarApiInalcancavel();
          await hydrate();
          if (!cancelled) {
            setVisitorReady(true);
            setVisitorErro(null);
          }
          return;
        }
        setVisitorReady(false);
        setVisitorErro('Não foi possível iniciar a sessão do cardápio.');
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    return iniciarVisitor();
  }, [iniciarVisitor, retryToken]);

  useOnReconnect(() => {
    void queryClient.invalidateQueries({ queryKey: ['cardapio'] });
    const baseUrl = apiBaseUrl();
    if (getToken() || !baseUrl) return;
    void ensureVisitor(baseUrl).catch(() => undefined);
  });

  return (
    <div className="flex min-h-dvh justify-center bg-background text-on-background">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background shadow-card pt-[env(safe-area-inset-top)]">
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/50 bg-surface/90 px-4 py-3 backdrop-blur-sm">
          <FoodHopeLogo
            markClassName="size-8"
            wordmarkClassName="text-title-md tracking-[0.2em]"
          />
        </header>
        {!online ? (
          <div
            role="status"
            className="shrink-0 border-b border-primary-container/40 bg-primary-container/25 px-4 py-2 text-caption text-on-surface"
          >
            <div className="flex items-center justify-between gap-3">
              <span>Sem conexão — mostrando dados salvos</span>
              <button
                type="button"
                className="shrink-0 font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => liberarRetryApi()}
              >
                Tentar de novo
              </button>
            </div>
          </div>
        ) : null}
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
