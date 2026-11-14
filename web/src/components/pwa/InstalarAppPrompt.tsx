import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '../ui';
import {
  detectarNavegadorInstalacao,
  dispensarInstalacao,
  foiDispensadoRecentemente,
  foiInstalado,
  podeInstalarNativo,
  solicitarInstalacao,
  subscribeInstalacao,
  type NavegadorInstalacao,
} from '../../lib/pwaInstall';
import { obterSessaoOperador } from '../../lib/sessaoOperador';
import { router } from '../../routes';
import { getToken } from '../../services';

/** Espera inicial antes de oferecer. */
const ATRASO_MS = 3000;
/**
 * Sem o prompt nativo até aqui, mostra instruções manuais. O Chrome só libera o
 * prompt após interação + 30 s na página, e nunca em aba anônima ou em
 * navegadores sem suporte (Firefox, navegador interno do Instagram etc.).
 */
const ATRASO_INSTRUCOES_MS = 12000;

const INSTRUCOES: Record<NavegadorInstalacao, ReactNode> = {
  ios: (
    <>
      Toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima)
      e depois em <strong>Adicionar à Tela de Início</strong>.
    </>
  ),
  inapp: (
    <>
      Este navegador não instala apps. Toque em <strong>⋯</strong> e escolha{' '}
      <strong>Abrir no navegador</strong> (Chrome ou Safari); lá aparece a
      opção de instalar.
    </>
  ),
  'android-chrome': (
    <>
      Toque no menu <strong>⋮</strong> do Chrome e escolha{' '}
      <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>).
    </>
  ),
  'android-samsung': (
    <>
      Toque no menu <strong>☰</strong>, depois em{' '}
      <strong>Adicionar página a</strong> → <strong>Tela inicial</strong>.
    </>
  ),
  'android-firefox': (
    <>
      Toque no menu <strong>⋮</strong> e escolha <strong>Instalar</strong> (ou{' '}
      <strong>Adicionar à tela inicial</strong>).
    </>
  ),
  'android-outro': (
    <>
      No menu do navegador, escolha <strong>Instalar app</strong> ou{' '}
      <strong>Adicionar à tela inicial</strong>.
    </>
  ),
  'desktop-chromium': (
    <>
      Clique no ícone de instalar na barra de endereço ou, no menu{' '}
      <strong>⋮</strong>, em <strong>Instalar Food Hope</strong>.
    </>
  ),
  'desktop-safari': (
    <>
      No menu <strong>Arquivo</strong>, escolha{' '}
      <strong>Adicionar ao Dock</strong>.
    </>
  ),
};

function rotaSemPopup(pathname: string): boolean {
  return pathname.startsWith('/painel/tela-pedidos');
}

async function podeOferecer(): Promise<boolean> {
  if (foiInstalado() || foiDispensadoRecentemente()) return false;
  if (rotaSemPopup(router.state.location.pathname)) return false;
  if (getToken()) {
    const sessao = await obterSessaoOperador();
    if (sessao?.role === 'TOTEM') return false;
  }
  return true;
}

type Modo = { tipo: 'nativo' } | { tipo: 'instrucoes'; navegador: NavegadorInstalacao };

export function InstalarAppPrompt() {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>({ tipo: 'nativo' });
  const [instalando, setInstalando] = useState(false);
  const jaOfereceuRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function oferecer(novo: Modo) {
      if (cancelled || jaOfereceuRef.current) return;
      jaOfereceuRef.current = true;
      setModo(novo);
      setAberto(true);
    }

    async function avaliar(permitirInstrucoes: boolean) {
      if (cancelled || jaOfereceuRef.current) return;
      if (!(await podeOferecer())) return;
      if (podeInstalarNativo()) {
        oferecer({ tipo: 'nativo' });
        return;
      }
      const navegador = detectarNavegadorInstalacao();
      if (!navegador) return;
      // iOS e navegadores internos nunca terão prompt nativo: não precisa esperar.
      if (permitirInstrucoes || navegador === 'ios' || navegador === 'inapp') {
        oferecer({ tipo: 'instrucoes', navegador });
      }
    }

    timers.push(setTimeout(() => void avaliar(false), ATRASO_MS));
    timers.push(setTimeout(() => void avaliar(true), ATRASO_INSTRUCOES_MS));

    const unsubscribe = subscribeInstalacao(() => {
      if (foiInstalado()) {
        setAberto(false);
        return;
      }
      if (podeInstalarNativo()) {
        // Prompt nativo chegou depois: troca as instruções pelo botão Instalar.
        setModo((atual) => (atual.tipo === 'instrucoes' ? { tipo: 'nativo' } : atual));
        void avaliar(false);
      }
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, []);

  const fechar = useCallback(() => {
    dispensarInstalacao();
    setAberto(false);
  }, []);

  const confirmar = useCallback(async () => {
    if (modo.tipo === 'instrucoes') {
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
        modo.tipo === 'instrucoes' ? (
          <>
            Adicione o app à sua tela inicial para abrir mais rápido.{' '}
            {INSTRUCOES[modo.navegador]}
          </>
        ) : (
          'Instale o app para abrir mais rápido, direto da tela inicial.'
        )
      }
      confirmLabel={modo.tipo === 'instrucoes' ? 'Entendi' : 'Instalar'}
      cancelLabel="Agora não"
      onConfirm={() => void confirmar()}
      onCancel={fechar}
    />
  );
}
