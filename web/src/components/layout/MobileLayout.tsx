import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useCarrinhoStore } from '../../stores/carrinho.store';
import { ensureVisitor } from '../../services/visitor';
import { ClienteBottomNav } from './ClienteBottomNav';

export function MobileAppLayout() {
  const hydrate = useCarrinhoStore((state) => state.hydrate);
  const [visitorReady, setVisitorReady] = useState(false);
  const [visitorErro, setVisitorErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
      /\/$/,
      '',
    );

    if (!baseUrl) {
      setVisitorErro('API não configurada.');
      return;
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
          setVisitorErro('Não foi possível iniciar a sessão do cardápio.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  return (
    <div className="flex min-h-screen justify-center bg-background text-on-background">
      <div className="relative flex w-full max-w-md flex-col min-h-screen overflow-hidden bg-background shadow-card">
        <header className="sticky top-0 z-20 shrink-0 border-b border-outline-variant/50 bg-surface/90 px-4 py-3 backdrop-blur-sm">
          <h1 className="text-headline text-primary-container">Food Hope</h1>
        </header>
        <main className="flex-1 overflow-y-auto pb-28">
          {visitorErro ? (
            <div className="flex flex-col gap-2 p-4">
              <p className="text-body-md text-danger">{visitorErro}</p>
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
        {visitorReady ? <ClienteBottomNav /> : null}
      </div>
    </div>
  );
}
