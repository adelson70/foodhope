import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button, ConfirmDialog, Skeleton } from '../../../components/ui';
import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import {
  categoriaService,
  getApiErrorMensagens,
} from '../../../services';
import type { Categoria } from '../../../services/types';
import { ConfigBackLink } from './ConfigBackLink';
import { CozinhaCategoriaCard } from './CozinhaCategoriaCard';
import { CozinhaCategoriaDrawer } from './CozinhaCategoriaDrawer';

export function ConfigCozinhaCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const showSkeleton = useDeferredLoading(loading);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await categoriaService.listar();
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar as categorias.');
        setCategorias([]);
        return;
      }
      setCategorias(response.dados.categorias);
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar as categorias.');
      setCategorias([]);
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

  function abrirEditar(categoria: Categoria) {
    setEditando(categoria);
    setDrawerAberto(true);
  }

  function fecharDrawer() {
    setDrawerAberto(false);
    setEditando(null);
  }

  function handleSaved(categoria: Categoria) {
    setCategorias((atual) => {
      const existe = atual.some((item) => item.id === categoria.id);
      const proxima = existe
        ? atual.map((item) => (item.id === categoria.id ? categoria : item))
        : [...atual, categoria];
      return [...proxima].sort((a, b) => a.ordem - b.ordem);
    });
  }

  async function mover(categoria: Categoria, direcao: -1 | 1) {
    const novaOrdem = categoria.ordem + direcao;
    if (novaOrdem < 0 || novaOrdem >= categorias.length) return;

    setBusyId(categoria.id);
    try {
      const response = await categoriaService.editar(categoria.id, {
        ordem: novaOrdem,
      });
      if (!response.sucesso) return;
      await carregar();
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
      const response = await categoriaService.deletar(id);
      if (!response.sucesso) return;
      setExcluindo(null);
      await carregar();
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
            Categorias
          </h1>
          <p className="text-caption text-on-surface-variant">
            Ordem na home do cardápio
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 shrink-0 px-3"
          onClick={abrirCriar}
        >
          <Plus size={14} strokeWidth={1.75} />
          Nova
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

      {!showSkeleton && !erro && categorias.length === 0 ? (
        <p className="text-caption text-on-surface-variant">
          Nenhuma categoria. Use “Nova” para criar.
        </p>
      ) : null}

      {!showSkeleton && !erro && categorias.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {categorias.map((categoria, index) => (
            <CozinhaCategoriaCard
              key={categoria.id}
              categoria={categoria}
              busy={busyId === categoria.id}
              isFirst={index === 0}
              isLast={index === categorias.length - 1}
              onMoveUp={(item) => void mover(item, -1)}
              onMoveDown={(item) => void mover(item, 1)}
              onEdit={abrirEditar}
              onDelete={setExcluindo}
            />
          ))}
        </ul>
      ) : null}

      <CozinhaCategoriaDrawer
        open={drawerAberto}
        categoria={editando}
        onClose={fecharDrawer}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(excluindo)}
        title="Excluir categoria?"
        description={
          excluindo
            ? `"${excluindo.nome}" será removida. Produtos vinculados passam para a seção Outros.`
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
