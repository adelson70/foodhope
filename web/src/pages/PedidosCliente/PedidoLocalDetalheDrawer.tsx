import { Drawer } from '../../components/ui';
import { formatarMoeda } from '../../lib/currency';
import type { PedidoLocal, PedidoLocalItem } from '../../lib/clienteStorage';

type PedidoLocalDetalheDrawerProps = {
  pedido: PedidoLocal | null;
  open: boolean;
  onClose: () => void;
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function totalItem(item: PedidoLocalItem): number {
  const preco = Number(item.preco) || 0;
  const base = preco * item.qtd;
  const extras = (item.adicionais ?? []).reduce(
    (soma, adic) => soma + (Number(adic.preco) || 0) * adic.qtd,
    0,
  );
  return base + extras;
}

function totalPedido(pedido: PedidoLocal): number {
  return pedido.itens.reduce((soma, item) => soma + totalItem(item), 0);
}

export function PedidoLocalDetalheDrawer({
  pedido,
  open,
  onClose,
}: PedidoLocalDetalheDrawerProps) {
  const total = pedido ? totalPedido(pedido) : 0;

  return (
    <Drawer
      open={open && Boolean(pedido)}
      title={pedido ? `Pedido #${pedido.numero}` : 'Pedido'}
      onClose={onClose}
    >
      {pedido ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-operator-border bg-operator-card p-3">
            <p className="text-caption text-on-surface-variant">
              {formatarData(pedido.createdAt)}
            </p>
            <p className="mt-1 text-subtitle-md text-on-surface">
              {pedido.nome_completo}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-subtitle-md text-on-surface">Itens</p>
            <ul className="flex flex-col gap-2">
              {pedido.itens.map((item, index) => (
                <li
                  key={`${pedido.id}-item-${index}`}
                  className="rounded-xl border border-operator-border bg-operator-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-body-md text-on-surface">
                      {item.qtd}× {item.nome}
                    </p>
                    {item.preco != null && Number(item.preco) > 0 ? (
                      <p className="shrink-0 text-caption text-primary">
                        {formatarMoeda(totalItem(item))}
                      </p>
                    ) : null}
                  </div>
                  {(item.adicionais ?? []).length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {item.adicionais.map((adic, adicIndex) => (
                        <li
                          key={`${pedido.id}-adic-${index}-${adicIndex}`}
                          className="text-caption text-on-surface-variant"
                        >
                          + {adic.qtd}× {adic.nome}
                          {adic.preco != null && Number(adic.preco) > 0
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
