import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { Button, Skeleton } from '../../components/ui';
import { useDeferredLoading } from '../../hooks/useDeferredLoading';
import { appendPedidoLocal } from '../../lib/clienteStorage';
import type { CarrinhoItem } from '../../lib/clienteTypes';
import { TIPO_CONSUMO_PADRAO } from '../../lib/tipoConsumo';
import { infinitepayService } from '../../services';
import type { Pedido, TipoConsumo } from '../../services/types';
import { useCarrinhoStore } from '../../stores/carrinho.store';
import { PedidoConfirmadoCheck } from './PedidoConfirmadoCheck';

type ConfirmadoLocationState = {
  numero?: string;
};

function primeiroParam(
  params: URLSearchParams,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

export function PedidoConfirmado() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = (location.state ?? {}) as ConfirmadoLocationState;
  const stateNumero = state.numero;

  const itens = useCarrinhoStore((s) => s.itens);
  const clear = useCarrinhoStore((s) => s.clear);

  const orderNsu = primeiroParam(searchParams, 'order_nsu');
  const transactionNsu = primeiroParam(searchParams, 'transaction_nsu');
  const slug = primeiroParam(searchParams, 'slug', 'invoice_slug');
  const receiptUrl = primeiroParam(searchParams, 'receipt_url') ?? undefined;
  const captureMethod =
    primeiroParam(searchParams, 'capture_method') ?? undefined;
  const temQueryCheckout = Boolean(orderNsu && transactionNsu && slug);

  const [numero, setNumero] = useState<string | null>(stateNumero ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(temQueryCheckout);
  const showSkeleton = useDeferredLoading(confirmando);
  const iniciouRef = useRef(false);

  useEffect(() => {
    if (!temQueryCheckout || iniciouRef.current) return;
    iniciouRef.current = true;

    let cancelled = false;

    void (async () => {
      setConfirmando(true);
      setErro(null);
      try {
        const response = await infinitepayService.confirmar({
          order_nsu: orderNsu!,
          transaction_nsu: transactionNsu!,
          slug: slug!,
          receipt_url: receiptUrl,
          capture_method: captureMethod,
        });

        if (cancelled) return;

        const pedido = response.dados?.pedido;
        if (!response.sucesso || !pedido) {
          setErro('Não foi possível confirmar o pagamento.');
          return;
        }

        await persistirPedidoLocal(pedido, itens);
        clear();
        setNumero(String(pedido.numero));
      } catch {
        if (!cancelled) {
          setErro('Não foi possível confirmar o pagamento.');
        }
      } finally {
        if (!cancelled) setConfirmando(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    temQueryCheckout,
    orderNsu,
    transactionNsu,
    slug,
    receiptUrl,
    captureMethod,
    itens,
    clear,
  ]);

  if (!stateNumero && !temQueryCheckout && !numero) {
    return <Navigate to="/" replace />;
  }

  if (confirmando || showSkeleton) {
    return (
      <div
        className="flex flex-col items-center gap-6 p-6"
        aria-busy="true"
        aria-label="Confirmando pagamento"
      >
        <Skeleton className="size-20 rounded-full" />
        <div className="flex w-full max-w-sm flex-col items-center gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-24 w-full max-w-sm rounded-xl" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center gap-6 p-6 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-headline-lg-mobile text-on-surface">
            Pagamento pendente
          </h2>
          <p className="text-body-md text-on-surface-variant">{erro}</p>
        </div>
        <Link to="/carrinho" className="w-full max-w-sm">
          <Button type="button" fullWidth>
            Voltar ao carrinho
          </Button>
        </Link>
      </div>
    );
  }

  if (!numero) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6 text-center">
      <PedidoConfirmadoCheck />

      <div className="flex flex-col gap-2">
        <h2 className="text-headline-lg-mobile text-on-surface">
          Pedido confirmado
        </h2>
        <p className="text-body-md text-on-surface-variant">
          Seu pedido foi registrado e já está na fila da cozinha.
        </p>
      </div>

      <div className="w-full rounded-xl border border-operator-border bg-operator-card px-4 py-4">
        <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          Número do pedido
        </p>
        <p className="mt-1 text-title-md text-primary">#{numero}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link to="/" className="w-full">
          <Button type="button" fullWidth>
            Voltar ao cardápio
          </Button>
        </Link>
        <Link
          to="/pedidos"
          className="text-caption text-primary underline-offset-2 hover:underline"
        >
          Ver meus pedidos
        </Link>
      </div>
    </div>
  );
}

async function persistirPedidoLocal(
  pedido: Pedido,
  itensCarrinho: CarrinhoItem[],
) {
  const tipoConsumo: TipoConsumo =
    pedido.tipo_consumo ?? TIPO_CONSUMO_PADRAO;

  if (itensCarrinho.length > 0) {
    await appendPedidoLocal({
      id: pedido.id,
      numero: String(pedido.numero),
      nome_completo: pedido.nome_completo,
      tipo_consumo: tipoConsumo,
      createdAt: pedido.createdAt ?? new Date().toISOString(),
      itens: itensCarrinho.map((item) => ({
        nome: item.nome,
        qtd: item.qtd,
        preco: item.preco,
        adicionais: item.adicionais.map((adic) => ({
          nome: adic.nome,
          preco: adic.preco,
          qtd: adic.qtd,
        })),
        observacao: item.observacao,
      })),
    });
    return;
  }

  await appendPedidoLocal({
    id: pedido.id,
    numero: String(pedido.numero),
    nome_completo: pedido.nome_completo,
    tipo_consumo: tipoConsumo,
    createdAt: pedido.createdAt ?? new Date().toISOString(),
    itens: (pedido.itens ?? []).map((item) => ({
      nome: item.produto?.nome ?? 'Item',
      qtd: item.quantidade,
      preco: Number(item.preco_produto),
      adicionais: (item.adicional_venda ?? []).map((adic) => ({
        nome: adic.nome,
        preco: Number(adic.preco),
        qtd: adic.qtd,
      })),
      observacao: item.observacao ?? undefined,
    })),
  });
}
