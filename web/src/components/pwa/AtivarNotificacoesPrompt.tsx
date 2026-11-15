import { useCallback, useEffect, useState } from 'react';

import { ConviteDrawer } from './ConviteDrawer';
import { isRotaEquipe } from '../../lib/dispositivoEquipe';
import {
  dispensarNotificacao,
  estadoPush,
  inscreverPedidosRecentes,
  notificacaoDispensadaRecentemente,
  marcarConvitePushDecidido,
} from '../../lib/pushPedido';
import { router } from '../../routes';
import { getToken } from '../../services';

const ATRASO_MS = 1500;

function rotaSemConvite(pathname: string): boolean {
  return isRotaEquipe(pathname) || pathname.startsWith('/painel');
}

/**
 * Ao abrir o app, convida a ativar as notificações de pedido pronto. A pergunta
 * do sistema só abre no toque em "Ativar" (o iOS exige um gesto do usuário).
 */
export function AtivarNotificacoesPrompt() {
  const [aberto, setAberto] = useState(false);
  const [ativando, setAtivando] = useState(false);

  useEffect(() => {
    // Permissão já dada: só garante a inscrição nos pedidos recentes.
    void inscreverPedidosRecentes().catch(() => {});

    const timer = setTimeout(() => {
      if (
        estadoPush() !== 'pendente' ||
        notificacaoDispensadaRecentemente() ||
        getToken() ||
        rotaSemConvite(router.state.location.pathname)
      ) {
        marcarConvitePushDecidido();
        return;
      }
      setAberto(true);
    }, ATRASO_MS);
    return () => clearTimeout(timer);
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
    marcarConvitePushDecidido();
  }, []);

  const agoraNao = useCallback(() => {
    dispensarNotificacao();
    fechar();
  }, [fechar]);

  const ativar = useCallback(async () => {
    setAtivando(true);
    try {
      const resultado = await Notification.requestPermission();
      if (resultado === 'granted') {
        await inscreverPedidosRecentes().catch(() => {});
      } else {
        dispensarNotificacao();
      }
    } finally {
      setAtivando(false);
      fechar();
    }
  }, [fechar]);

  return (
    <ConviteDrawer
      open={aberto}
      title="Ativar notificações"
      loading={ativando}
      confirmLabel="Ativar"
      onConfirm={() => void ativar()}
      onCancel={agoraNao}
    >
      Receba um aviso no celular quando o seu pedido ficar pronto para retirada.
    </ConviteDrawer>
  );
}
