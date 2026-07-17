import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useCarrinhoStore } from '../../stores/carrinho.store';
import { ensureVisitor } from '../../services/visitor';

export function MobileAppLayout() {
  const totalItens = useCarrinhoStore((state) => state.totalItens);
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
      .then(() => {
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
  }, []);

  return (
    <div className="min-h-screen flex justify-center bg-secondary-900">
      <div className="w-full max-w-md bg-secondary-500 relative shadow-card flex flex-col min-h-screen overflow-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-operator-border bg-secondary-500/95 px-4 py-3 backdrop-blur-sm">
          <h1 className="text-headline text-primary">Food Hope</h1>
          <button
            type="button"
            className="relative flex size-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface"
            aria-label={
              totalItens > 0
                ? `Carrinho com ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`
                : 'Carrinho'
            }
          >
            <ShoppingCart size={22} strokeWidth={1.75} />
            {totalItens > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-label-sm text-on-primary">
                {totalItens > 99 ? '99+' : totalItens}
              </span>
            ) : null}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
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
      </div>
    </div>
  );
}
