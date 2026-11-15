import { useCallback, useEffect, useState } from 'react';

import { ConviteDrawer } from './ConviteDrawer';
import { isRotaEquipe } from '../../lib/dispositivoEquipe';
import {
  dispensarNotificacao,
  estadoPush,
  notificacaoDispensadaRecentemente,
  registrarDispositivo,
  marcarConvitePushDecidido,
} from '../../lib/pushPedido';
import { router } from '../../routes';
import { getToken } from '../../services';

const ATRASO_MS = 1500;
/** Ao voltar para o app, reconfirma o token (ele pode mudar) no máximo nesse intervalo. */
const INTERVALO_REGISTRO_MS = 10 * 60 * 1000;

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
    // Permissão já dada: confirma o token do aparelho ao abrir e ao voltar para o
    // app. Até dar certo tenta a cada volta; depois, no máximo a cada 10 min.
    let ultimoOk = 0;
    function registrar() {
      registrarDispositivo()
        .then(() => {
          ultimoOk = Date.now();
        })
        .catch(() => {});
    }
    registrar();
    function aoVoltar() {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - ultimoOk < INTERVALO_REGISTRO_MS) return;
      registrar();
    }
    document.addEventListener('visibilitychange', aoVoltar);

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
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
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
        await registrarDispositivo().catch(() => {});
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
