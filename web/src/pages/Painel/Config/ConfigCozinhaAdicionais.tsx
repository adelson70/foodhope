import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button, ConfirmDialog, Skeleton } from '../../../components/ui';
import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import {
  adicionalService,
  getApiErrorMensagens,
} from '../../../services';
import type { AdicionalGlobal } from '../../../services/types';
import { ConfigBackLink } from './ConfigBackLink';
import { CozinhaAdicionalCard } from './CozinhaAdicionalCard';
import { CozinhaAdicionalDrawer } from './CozinhaAdicionalDrawer';

export function ConfigCozinhaAdicionais() {
  const [adicionais, setAdicionais] = useState<AdicionalGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [editando, setEditando] = useState<AdicionalGlobal | null>(null);
  const [excluindo, setExcluindo] = useState<AdicionalGlobal | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const showSkeleton = useDeferredLoading(loading);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await adicionalService.listar();
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar os adicionais.');
        setAdicionais([]);
        return;
      }
      setAdicionais(response.dados.adicionais);
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar os adicionais.');
      setAdicionais([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function abrirCriar() {
    setEditando(null);
    setDrawerAberto(true);
  }

  function abrirEditar(adicional: AdicionalGlobal) {
    setEditando(adicional);
    setDrawerAberto(true);
  }

  function fecharDrawer() {
    setDrawerAberto(false);
    setEditando(null);
  }

  function handleSaved(adicional: AdicionalGlobal) {
    setAdicionais((atual) => {
      const existe = atual.some((item) => item.id === adicional.id);
      if (!existe) {
        return [...atual, adicional].sort((a, b) =>
          a.nome.localeCompare(b.nome, 'pt-BR'),
        );
      }
      return atual
        .map((item) => (item.id === adicional.id ? adicional : item))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    });
  }

  async function handleToggleAtivo(adicional: AdicionalGlobal) {
    setBusyId(adicional.id);
    try {
      const response = await adicionalService.editar(adicional.id, {
        ativo: !adicional.ativo,
      });
      if (!response.sucesso || !response.dados || !('id' in response.dados)) {
        return;
      }
      const atualizado = response.dados;
      setAdicionais((atual) =>
        atual.map((item) => (item.id === atualizado.id ? atualizado : item)),
      );
    } catch {
      return;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    setBusyId(id);
    try {
      const response = await adicionalService.deletar(id);
      if (!response.sucesso) return;
      setAdicionais((atual) => atual.filter((item) => item.id !== id));
      setExcluindo(null);
    } catch {
      return;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfigBackLink to="/painel/configuracoes/cozinha" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-title-md font-semibold text-on-surface">
            Adicionais
          </h1>
          <p className="text-caption text-on-surface-variant">
            Globais e disponibilidade
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 shrink-0 px-3"
          onClick={abrirCriar}
        >
          <Plus size={14} strokeWidth={1.75} />
          Novo
        </Button>
      </div>

      {showSkeleton ? (
        <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-28 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : null}

      {!showSkeleton && erro ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
          {erro}
        </div>
      ) : null}

      {!showSkeleton && !erro && adicionais.length === 0 ? (
        <p className="text-caption text-on-surface-variant">
          Nenhum adicional global. Use “Novo” para criar.
        </p>
      ) : null}

      {!showSkeleton && !erro && adicionais.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {adicionais.map((adicional) => (
            <CozinhaAdicionalCard
              key={adicional.id}
              adicional={adicional}
              busy={busyId === adicional.id}
              onToggleAtivo={handleToggleAtivo}
              onEdit={abrirEditar}
              onDelete={setExcluindo}
            />
          ))}
        </ul>
      ) : null}

      <CozinhaAdicionalDrawer
        open={drawerAberto}
        adicional={editando}
        onClose={fecharDrawer}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(excluindo)}
        title="Excluir adicional?"
        description={
          excluindo
            ? `"${excluindo.nome}" será removido do catálogo da cozinha e dos produtos vinculados.`
            : undefined
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={busyId === excluindo?.id}
        onConfirm={() => void confirmarExclusao()}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
