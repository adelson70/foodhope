import type { Pedido } from '../../../services/types';

type TelaPedidosCardProps = {
  pedido: Pedido;
};

export function TelaPedidosCard({ pedido }: TelaPedidosCardProps) {
  return (
    <article className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-success px-1 py-1 shadow-card">
      <p className="font-extrabold leading-none text-surface-container-low text-[26vh]">
        {pedido.numero}
      </p>
      <h2 className="mt-1 w-full truncate text-center font-semibold leading-tight text-surface-container-low text-[6vh]">
        {pedido.nome_completo}
      </h2>
    </article>
  );
}
