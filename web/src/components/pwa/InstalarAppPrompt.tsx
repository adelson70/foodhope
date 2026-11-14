import { useCallback, useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from '../ui';
import {
  dispensarInstalacao,
  foiDispensadoRecentemente,
  foiInstalado,
  isIos,
  podeInstalarNativo,
  solicitarInstalacao,
  subscribeInstalacao,
} from '../../lib/pwaInstall';
import { obterSessaoOperador } from '../../lib/sessaoOperador';
import { router } from '../../routes';
import { getToken } from '../../services';

const ATRASO_MS = 3000;

function rotaSemPopup(pathname: string): boolean {
  return pathname.startsWith('/painel/tela-pedidos');
}

async function deveOferecer(): Promise<boolean> {
  if (foiInstalado() || foiDispensadoRecentemente()) return false;
  if (rotaSemPopup(router.state.location.pathname)) return false;
  if (!podeInstalarNativo() && !isIos()) return false;
  if (getToken()) {
    const sessao = await obterSessaoOperador();
    if (sessao?.role === 'TOTEM') return false;
  }
  return true;
}

export function InstalarAppPrompt() {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<'nativo' | 'ios'>('nativo');
  const [instalando, setInstalando] = useState(false);
  const jaOfereceuRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function agendar() {
      if (jaOfereceuRef.current || timer) return;
      timer = setTimeout(() => {
        timer = null;
        void deveOferecer().then((ok) => {
          if (cancelled || !ok || jaOfereceuRef.current) return;
          jaOfereceuRef.current = true;
          setModo(podeInstalarNativo() ? 'nativo' : 'ios');
          setAberto(true);
        });
      }, ATRASO_MS);
    }

    agendar();
    const unsubscribe = subscribeInstalacao(() => {
      if (foiInstalado()) {
        setAberto(false);
        return;
      }
      agendar();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const fechar = useCallback(() => {
    dispensarInstalacao();
    setAberto(false);
  }, []);

  const confirmar = useCallback(async () => {
    if (modo === 'ios') {
      fechar();
      return;
    }
    setInstalando(true);
    try {
      const aceitou = await solicitarInstalacao();
      if (!aceitou) dispensarInstalacao();
    } finally {
      setInstalando(false);
      setAberto(false);
    }
  }, [fechar, modo]);

  return (
    <ConfirmDialog
      open={aberto}
      title="Instalar o Food Hope"
      variant="primary"
      loading={instalando}
      description={
        modo === 'ios' ? (
          <>
            Adicione o app à tela de início: toque em{' '}
            <strong>Compartilhar</strong> (o quadrado com a seta para cima) e
            depois em <strong>Adicionar à Tela de Início</strong>.
          </>
        ) : (
          'Instale o app para abrir mais rápido, direto da tela inicial.'
        )
      }
      confirmLabel={modo === 'ios' ? 'Entendi' : 'Instalar'}
      cancelLabel="Agora não"
      onConfirm={() => void confirmar()}
      onCancel={fechar}
    />
  );
}
