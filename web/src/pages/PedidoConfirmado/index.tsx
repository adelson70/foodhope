import { Link, Navigate, useLocation } from 'react-router-dom';

import { Button } from '../../components/ui';
import { PedidoConfirmadoCheck } from './PedidoConfirmadoCheck';

type ConfirmadoLocationState = {
  numero?: string;
};

export function PedidoConfirmado() {
  const location = useLocation();
  const state = (location.state ?? {}) as ConfirmadoLocationState;
  const numero = state.numero;

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
          <Button type="button" fullWidth className="py-4">
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
