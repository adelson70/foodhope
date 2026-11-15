import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Layers, Plus } from 'lucide-react';

import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import { cn } from '../../../lib/cn';
import { isOfflineNow } from '../../../lib/network';
import { formatarMoeda } from '../../../lib/currency';
import { cozinhaService, getApiErrorMensagens } from '../../../services';
import type { AberturaCaixa } from '../../../services/types';
import { Skeleton } from '../../../components/ui';
import { AberturaCaixaDrawer } from './AberturaCaixaDrawer';
import { ConfigBackLink } from './ConfigBackLink';

function horaAbertura(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConfigCozinha() {
  const [ativa, setAtiva] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindoCaixa, setAbrindoCaixa] = useState(false);
  const [abertura, setAbertura] = useState<AberturaCaixa | null>(null);
  const showSkeleton = useDeferredLoading(loading);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (isOfflineNow()) {
        setErro('Operação da cozinha indisponível offline.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErro(null);
      try {
        const response = await cozinhaService.obter();
        if (cancelled) return;
        if (!response.sucesso || !response.dados) {
          setErro(
            response.mensagens[0] ??
              'Não foi possível carregar o status da cozinha.',
          );
          return;
        }
        setAtiva(response.dados.ativa);
        const ultima = await cozinhaService
          .ultimaAbertura()
          .catch(() => undefined);
        if (!cancelled && ultima?.sucesso && ultima.dados) {
          setAbertura(ultima.dados.abertura);
        }
      } catch (error) {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(
          mensagens[0] ?? 'Não foi possível carregar o status da cozinha.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle() {
    if (busy) return;
    // Abrir a cozinha passa pelo caixa: pergunta o dinheiro para troco antes.
    if (!ativa) {
      setAbrindoCaixa(true);
      return;
    }
    setBusy(true);
    try {
      const response = await cozinhaService.atualizar(false);
      if (response.sucesso && response.dados) {
        setAtiva(response.dados.ativa);
      }
    } catch {
      // o toast do serviço já mostra o erro
    } finally {
      setBusy(false);
    }
  }

  async function handleAbrirCaixa(dados: {
    fundo_troco: number;
    observacao?: string;
  }) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await cozinhaService.atualizar(true, dados);
      if (response.sucesso && response.dados) {
        setAtiva(response.dados.ativa);
        if (response.dados.abertura) setAbertura(response.dados.abertura);
        setAbrindoCaixa(false);
      }
    } catch {
      // o toast do serviço já mostra o erro
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfigBackLink to="/painel/configuracoes" />

      <div>
        <h1 className="text-title-md font-semibold text-on-surface">
          Operação da cozinha
        </h1>
        <p className="text-caption text-on-surface-variant">
          Abertura da loja, adicionais e categorias
        </p>
      </div>

      {showSkeleton ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ) : erro ? (
        <p className="text-body-md text-danger">{erro}</p>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card">
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-medium text-on-surface">
              Ativar cozinha
            </p>
            <p className="text-caption text-on-surface-variant">
              {ativa
                ? 'Loja aberta — clientes podem comprar'
                : 'Loja fechada — cardápio visível sem compra'}
            </p>
            {abertura ? (
              <p className="mt-1 text-caption text-on-surface-variant">
                Última abertura do caixa: {formatarMoeda(abertura.fundo_troco)}{' '}
                em {horaAbertura(abertura.createdAt)}
                {abertura.observacao ? ` · ${abertura.observacao}` : ''}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={ativa}
            aria-label={ativa ? 'Desativar cozinha' : 'Ativar cozinha'}
            disabled={busy}
            onClick={() => void handleToggle()}
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors',
              ativa ? 'bg-primary' : 'bg-outline-variant',
              busy && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-card transition-transform',
                ativa && 'translate-x-4',
              )}
            />
          </button>
        </div>
      )}

      <AberturaCaixaDrawer
        open={abrindoCaixa}
        busy={busy}
        sugestao={abertura?.fundo_troco}
        onClose={() => setAbrindoCaixa(false)}
        onConfirmar={(dados) => void handleAbrirCaixa(dados)}
      />

      <ul className="flex flex-col gap-3">
        <li>
          <Link
            to="/painel/configuracoes/cozinha/adicionais"
            className="flex items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <Plus size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Adicionais
              </span>
              <span className="block text-caption text-on-surface-variant">
                Globais e disponibilidade
              </span>
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </Link>
        </li>

        <li>
          <Link
            to="/painel/configuracoes/cozinha/categorias"
            className="flex items-center gap-3 rounded-xl border border-operator-border bg-operator-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
              <Layers size={19} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">
                Categorias
              </span>
              <span className="block text-caption text-on-surface-variant">
                Ordem na home do cardápio
              </span>
            </span>
            <ChevronRight
              size={17}
              strokeWidth={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          </Link>
        </li>
      </ul>
    </div>
  );
}
