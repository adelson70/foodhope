import { Printer, PrinterX, Unplug } from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '../../../components/ui';
import { useOnReconnect } from '../../../hooks/useOnReconnect';
import { isOfflineNow } from '../../../lib/network';
import {
  impressoraService,
  notifyError,
  pedidoService,
  socket,
} from '../../../services';
import type { ResumoFilaImpressao } from '../../../services/types';

/** Reserva caso algum evento do socket se perca. */
const INTERVALO_ATUALIZAR_MS = 60_000;

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

type AvisoProps = {
  tom: 'danger' | 'warning';
  icone: ReactNode;
  titulo: string;
  texto: string;
  acao?: ReactNode;
};

function Aviso({ tom, icone, titulo, texto, acao }: AvisoProps) {
  return (
    <div
      role="status"
      className={
        tom === 'danger'
          ? 'flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3'
          : 'flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3'
      }
    >
      <span
        className={
          tom === 'danger'
            ? 'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger'
            : 'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-on-surface'
        }
      >
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-md font-medium text-on-surface">{titulo}</p>
        <p className="text-caption text-on-surface-variant">{texto}</p>
        {acao ? <div className="mt-2">{acao}</div> : null}
      </div>
    </div>
  );
}

/**
 * Aviso no topo de Pedidos: ponte/impressora fora (cupons esperando na fila) e pedidos cujo
 * cupom não saiu, com o botão de reimprimir todos.
 */
export function ImpressaoFilaAviso() {
  const [resumo, setResumo] = useState<ResumoFilaImpressao | null>(null);
  const [reimprimindo, setReimprimindo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await impressoraService.fila();
      if (resposta.sucesso) setResumo(resposta.dados);
    } catch {
      // sem rede: mantém o último resumo
    }
  }, []);

  /** Agrupa rajadas de `ponte:status` numa consulta só. */
  const agendarCarga = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void carregar();
    }, 500);
  }, [carregar]);

  useEffect(() => {
    void carregar();
    const intervalo = setInterval(() => void carregar(), INTERVALO_ATUALIZAR_MS);

    function onFila(novo: ResumoFilaImpressao) {
      setResumo(novo);
    }
    socket.on('impressao:fila', onFila);
    socket.on('ponte:status', agendarCarga);
    socket.on('connect', agendarCarga);
    return () => {
      clearInterval(intervalo);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      socket.off('impressao:fila', onFila);
      socket.off('ponte:status', agendarCarga);
      socket.off('connect', agendarCarga);
    };
  }, [carregar, agendarCarga]);

  useOnReconnect(() => {
    void carregar();
  });

  async function reimprimirTodos() {
    if (isOfflineNow()) {
      notifyError(null, 'Sem conexão: reimpressão precisa de internet.');
      return;
    }
    setReimprimindo(true);
    try {
      await pedidoService.reimprimirNaoImpressos();
      await carregar();
    } catch {
      return;
    } finally {
      setReimprimindo(false);
    }
  }

  if (!resumo) return null;

  const esperando =
    resumo.esperando > 0
      ? `${plural(resumo.esperando, 'cupom esperando', 'cupons esperando')}: saem sozinhos, na ordem, quando ela voltar.`
      : 'Os próximos cupons esperam na fila e saem sozinhos quando ela voltar.';

  return (
    <>
      {resumo.usaPonte && !resumo.ponteConectada ? (
        <Aviso
          tom="danger"
          icone={<Unplug size={18} strokeWidth={1.75} aria-hidden />}
          titulo="Ponte da impressora desconectada"
          texto={`Sem energia ou sem Wi-Fi na ponte ESP32. ${esperando}`}
        />
      ) : resumo.usaPonte && resumo.impressoraFora && resumo.esperando > 0 ? (
        <Aviso
          tom="warning"
          icone={<Printer size={18} strokeWidth={1.75} aria-hidden />}
          titulo="A ponte não encontra a impressora"
          texto={`Confira se a impressora está ligada. ${esperando}`}
        />
      ) : null}

      {resumo.naoImpressos > 0 ? (
        <Aviso
          tom="danger"
          icone={<PrinterX size={18} strokeWidth={1.75} aria-hidden />}
          titulo={plural(
            resumo.naoImpressos,
            'pedido não foi impresso',
            'pedidos não foram impressos',
          )}
          texto="O cupom esgotou as tentativas. Os pedidos estão marcados como “Não impresso” na lista."
          acao={
            <Button
              type="button"
              variant="secondary"
              className="h-10 px-3"
              disabled={reimprimindo}
              onClick={() => {
                void reimprimirTodos();
              }}
            >
              <Printer size={17} strokeWidth={1.75} aria-hidden />
              {reimprimindo ? 'Enviando…' : 'Reimprimir todos'}
            </Button>
          }
        />
      ) : null}
    </>
  );
}
