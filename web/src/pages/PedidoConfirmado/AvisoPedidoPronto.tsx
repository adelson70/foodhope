import { BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../../components/ui';
import {
  ativarAvisoPedido,
  estadoPush,
  type EstadoPush,
} from '../../lib/pushPedido';

type Props = { pedidoId: string };

export function AvisoPedidoPronto({ pedidoId }: Props) {
  const [estado, setEstado] = useState<EstadoPush>(() => estadoPush());
  const [ativando, setAtivando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  // Permissão já concedida em outro pedido: inscreve sem perguntar de novo.
  useEffect(() => {
    if (estadoPush() !== 'ativo') return;
    ativarAvisoPedido(pedidoId, false)
      .then(setEstado)
      .catch(() => setFalhou(true));
  }, [pedidoId]);

  async function ativar() {
    setAtivando(true);
    setFalhou(false);
    try {
      setEstado(await ativarAvisoPedido(pedidoId, true));
    } catch {
      setFalhou(true);
    } finally {
      setAtivando(false);
    }
  }

  if (estado === 'indisponivel') return null;

  let conteudo;
  if (falhou) {
    conteudo = (
      <>
        <p>Não foi possível ativar o aviso. Fique de olho no painel de retirada.</p>
        <Button type="button" variant="secondary" fullWidth onClick={ativar}>
          Tentar de novo
        </Button>
      </>
    );
  } else if (estado === 'ativo') {
    conteudo = <p>Vamos te avisar neste aparelho quando o pedido ficar pronto.</p>;
  } else if (estado === 'pendente') {
    conteudo = (
      <>
        <p>Receba uma notificação quando o pedido ficar pronto.</p>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={ativando}
          onClick={ativar}
        >
          {ativando ? 'Ativando…' : 'Avisar quando ficar pronto'}
        </Button>
      </>
    );
  } else if (estado === 'bloqueado') {
    conteudo = (
      <p>
        As notificações estão bloqueadas para este site. Libere nas
        configurações do navegador para receber o aviso.
      </p>
    );
  } else {
    conteudo = (
      <p>
        No iPhone, o aviso de pedido pronto só funciona com o app na tela de
        início: toque em Compartilhar e depois em “Adicionar à Tela de Início”.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-operator-border bg-operator-card px-4 py-4 text-left text-body-md text-on-surface-variant">
      <div className="flex items-center gap-2 text-on-surface">
        <BellRing className="size-5 text-primary" aria-hidden />
        <span className="text-label-sm uppercase tracking-widest">Aviso de pedido pronto</span>
      </div>
      {conteudo}
    </div>
  );
}
