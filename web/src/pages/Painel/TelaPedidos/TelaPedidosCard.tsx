import type { Pedido } from '../../../services/types';

type TelaPedidosCardProps = {
  pedido: Pedido;
};

export function TelaPedidosCard({ pedido }: TelaPedidosCardProps) {
  return (
    <article className="flex flex-col items-center rounded-xl border border-operator-border bg-operator-card px-2 py-2 shadow-card">
      <p className="font-bold leading-none text-on-surface text-[8vh]">
        #{pedido.numero}
      </p>
      <h2 className="mt-1 w-full truncate text-center font-semibold leading-none text-on-surface text-[3vh]">
        {pedido.nome_completo}
      </h2>
    </article>
  );
}
