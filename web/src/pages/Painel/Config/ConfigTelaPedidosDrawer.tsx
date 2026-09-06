import { useEffect, useState } from 'react';
import { Copy, ExternalLink, RefreshCw } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  Drawer,
  Input,
  Label,
  Loading,
} from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { urlTelaPedidosCompleta } from '../../../lib/abrirTelaPedidos';
import {
  getApiErrorMensagens,
  notifyError,
  notifySuccess,
  telaPedidosService,
} from '../../../services';
import type {
  ConfigTelaPedidos,
  VisualizacaoTelaPedidos,
} from '../../../services/types';

type ConfigTelaPedidosDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const OPCOES_VISUALIZACAO: Array<{
  value: VisualizacaoTelaPedidos;
  label: string;
  descricao: string;
}> = [
  {
    value: 'DIA',
    label: 'Por dia',
    descricao: 'Só pedidos prontos de hoje (fuso de São Paulo)',
  },
  {
    value: 'TUDO',
    label: 'Tudo',
    descricao: 'Todos os pedidos prontos, sem filtro de data',
  },
];

export function ConfigTelaPedidosDrawer({
  open,
  onClose,
}: ConfigTelaPedidosDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigTelaPedidos | null>(null);
  const [confirmRegenerar, setConfirmRegenerar] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [salvandoVisualizacao, setSalvandoVisualizacao] = useState(false);
  const [atualizandoTela, setAtualizandoTela] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setErro(null);

    telaPedidosService
      .obter()
      .then((response) => {
        if (cancelled) return;
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível carregar o link da tela de pedidos.');
          setConfig(null);
          return;
        }
        setConfig(response.dados);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const mensagens = getApiErrorMensagens(error);
        setErro(
          mensagens[0] ??
            'Não foi possível carregar o link da tela de pedidos.',
        );
        setConfig(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const urlCompleta = config ? urlTelaPedidosCompleta(config.urlPath) : '';
  const visualizacaoAtiva = config?.visualizacao ?? 'DIA';

  async function copiarUrl() {
    if (!urlCompleta) return;
    try {
      await navigator.clipboard.writeText(urlCompleta);
      notifySuccess('URL da tela copiada');
    } catch {
      notifyError(null, 'Não foi possível copiar a URL');
    }
  }

  function abrirTela() {
    if (!urlCompleta) return;
    const popup = window.open(urlCompleta, 'foodhope-tela-pedidos');
    if (!popup) {
      notifyError(
        null,
        'O navegador bloqueou a nova aba. Permita pop-ups para o Food Hope.',
      );
    }
  }

  async function regenerar() {
    setRegenerando(true);
    try {
      const response = await telaPedidosService.regenerar();
      if (response.sucesso && response.dados) {
        setConfig(response.dados);
        setConfirmRegenerar(false);
      }
    } catch {
      return;
    } finally {
      setRegenerando(false);
    }
  }

  async function alterarVisualizacao(visualizacao: VisualizacaoTelaPedidos) {
    if (
      !config ||
      config.visualizacao === visualizacao ||
      salvandoVisualizacao
    ) {
      return;
    }

    setSalvandoVisualizacao(true);
    try {
      const response =
        await telaPedidosService.atualizarVisualizacao(visualizacao);
      if (response.sucesso && response.dados) {
        setConfig(response.dados);
      }
    } catch {
      return;
    } finally {
      setSalvandoVisualizacao(false);
    }
  }

  async function forcarRefresh() {
    if (atualizandoTela) return;
    setAtualizandoTela(true);
    try {
      await telaPedidosService.forcarRefresh();
    } catch {
      return;
    } finally {
      setAtualizandoTela(false);
    }
  }

  const pronto = !loading && !erro && config;

  return (
    <>
      <Drawer
        open={open}
        title="Tela de pedidos prontos"
        onClose={onClose}
        footer={
          pronto ? (
            <div className="flex w-full flex-col gap-2">
              <Button type="button" fullWidth onClick={abrirTela}>
                <ExternalLink size={15} strokeWidth={2} aria-hidden />
                Abrir tela
              </Button>
              <Button
                type="button"
                fullWidth
                variant="secondary"
                disabled={atualizandoTela}
                onClick={() => {
                  void forcarRefresh();
                }}
              >
                <RefreshCw
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className={cn(atualizandoTela && 'animate-spin')}
                />
                {atualizandoTela ? 'Atualizando…' : 'Atualizar tela'}
              </Button>
              <Button
                type="button"
                fullWidth
                variant="dangerGhost"
                disabled={regenerando}
                onClick={() => setConfirmRegenerar(true)}
              >
                Regenerar link
              </Button>
            </div>
          ) : null
        }
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Loading />
          </div>
        ) : null}

        {!loading && erro ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
            {erro}
          </div>
        ) : null}

        {pronto ? (
          <div className="flex flex-col gap-5">
            <p className="text-caption text-on-surface-variant">
              Link público para TV ou kiosk. Quem tiver a URL vê os pedidos
              prontos
              {visualizacaoAtiva === 'DIA' ? ' do dia' : ''}, sem login.
            </p>

            <div className="space-y-2">
              <Label htmlFor="tela-pedidos-url">URL pública</Label>
              <div className="flex gap-2">
                <Input
                  id="tela-pedidos-url"
                  value={urlCompleta}
                  readOnly
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="size-11 shrink-0 px-0 py-0"
                  aria-label="Copiar URL da tela"
                  onClick={() => {
                    void copiarUrl();
                  }}
                >
                  <Copy size={17} strokeWidth={1.75} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label id="tela-pedidos-visualizacao-label">Visualização</Label>
              <div
                role="radiogroup"
                aria-labelledby="tela-pedidos-visualizacao-label"
                className="grid grid-cols-2 gap-2"
              >
                {OPCOES_VISUALIZACAO.map((opcao) => {
                  const ativo = visualizacaoAtiva === opcao.value;
                  return (
                    <button
                      key={opcao.value}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      disabled={salvandoVisualizacao}
                      onClick={() => {
                        void alterarVisualizacao(opcao.value);
                      }}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-body-md font-medium transition-colors',
                        'disabled:opacity-50',
                        ativo
                          ? 'border-primary bg-primary-container/40 text-on-surface'
                          : 'border-operator-border bg-operator-card text-on-surface-variant hover:text-on-surface',
                      )}
                    >
                      {opcao.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-caption text-on-surface-variant">
                {
                  OPCOES_VISUALIZACAO.find(
                    (opcao) => opcao.value === visualizacaoAtiva,
                  )?.descricao
                }
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirmRegenerar}
        title="Regenerar link?"
        description="O link atual deixa de funcionar. TVs e kiosks precisam do novo URL."
        variant="danger"
        loading={regenerando}
        confirmLabel="Regenerar"
        onConfirm={() => {
          void regenerar();
        }}
        onCancel={() => {
          if (!regenerando) setConfirmRegenerar(false);
        }}
      />
    </>
  );
}
