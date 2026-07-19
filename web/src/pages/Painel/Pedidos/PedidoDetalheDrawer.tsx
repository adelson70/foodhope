import { useState } from 'react';
import { Printer } from 'lucide-react';

import { Button, Drawer } from '../../../components/ui';
import { rotuloTipoConsumo } from '../../../lib/tipoConsumo';
import { pedidoService } from '../../../services';
import type { Pedido } from '../../../services/types';
import { formatarMoeda, totalItem, totalPedido } from './pedidoTotais';

type PedidoDetalheDrawerProps = {
  pedido: Pedido | null;
  open: boolean;
  onClose: () => void;
};

function formatarDataCompleta(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PedidoDetalheDrawer({
  pedido,
  open,
  onClose,
}: PedidoDetalheDrawerProps) {
  const [imprimindo, setImprimindo] = useState(false);
  const total = pedido ? totalPedido(pedido) : 0;
  const itens = pedido?.itens ?? [];

  async function handleReimprimir() {
    if (!pedido) return;
    setImprimindo(true);
    try {
      await pedidoService.reimprimir(pedido.id);
    } catch {
      return;
    } finally {
      setImprimindo(false);
    }
  }

  return (
    <Drawer
      open={open && Boolean(pedido)}
      title={pedido ? `Pedido #${pedido.numero}` : 'Pedido'}
      onClose={onClose}
      footer={
        pedido ? (
          <Button
            type="button"
            variant="primary"
            fullWidth
            disabled={imprimindo}
            onClick={() => {
              void handleReimprimir();
            }}
          >
            <Printer size={17} strokeWidth={1.75} />
            {imprimindo ? 'Enviando…' : 'Imprimir novamente'}
          </Button>
        ) : null
      }
    >
      {pedido ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-operator-border bg-operator-card p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption text-on-surface-variant">
                {formatarDataCompleta(pedido.createdAt)}
              </span>
              <span className="rounded-full bg-primary-container/40 px-3 py-1 text-label-sm font-medium text-on-surface">
                {rotuloTipoConsumo(pedido.tipo_consumo)}
              </span>
            </div>
            <p className="mt-2 text-subtitle-md font-medium text-on-surface">
              {pedido.nome_completo}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-subtitle-md text-on-surface">Itens</p>
            <ul className="flex flex-col gap-2">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-operator-border bg-operator-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-body-md text-on-surface">
                      {item.quantidade}× {item.produto?.nome ?? 'Item'}
                    </p>
                    <p className="shrink-0 text-caption text-primary">
                      {formatarMoeda(totalItem(item))}
                    </p>
                  </div>
                  {(item.adicional_venda ?? []).length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {(item.adicional_venda ?? []).map((adic, adicIndex) => (
                        <li
                          key={`${item.id}-adic-${adicIndex}`}
                          className="text-caption text-on-surface-variant"
                        >
                          + {adic.qtd}× {adic.nome}
                          {Number(adic.preco) > 0
                            ? ` (${formatarMoeda(Number(adic.preco) * adic.qtd)})`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.observacao ? (
                    <p className="mt-2 text-caption text-on-surface-variant">
                      Obs.: {item.observacao}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {total > 0 ? (
            <div className="flex items-center justify-between rounded-xl border border-operator-border bg-operator-card px-4 py-3">
              <span className="text-subtitle-md text-on-surface">Total</span>
              <span className="text-title-md text-primary">
                {formatarMoeda(total)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
