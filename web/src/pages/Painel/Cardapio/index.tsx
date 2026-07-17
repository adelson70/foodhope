import { useCallback, useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ui';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import {
  getApiErrorMensagens,
  produtoService,
} from '../../../services';
import type { Produto } from '../../../services/types';
import { CardapioHeader } from './CardapioHeader';
import { CardapioLista } from './CardapioLista';
import { CardapioSearch } from './CardapioSearch';
import { ProdutoFormDrawer } from './ProdutoFormDrawer';

const LISTAR_LIMIT = 20;

export function Cardapio() {
  const [buscaInput, setBuscaInput] = useState('');
  const busca = useDebouncedValue(buscaInput.trim());
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [produtoEditar, setProdutoEditar] = useState<Produto | null>(null);
  const [produtoExcluir, setProdutoExcluir] = useState<Produto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const showSkeleton = useDeferredLoading(loading && produtos.length === 0);
  const showMoreSkeleton = useDeferredLoading(loadingMore);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  const nextCursorRef = useRef<string | null>(null);

  const carregar = useCallback(async (termo: string) => {
    setLoading(true);
    setErro(null);
    setHasNextPage(false);
    nextCursorRef.current = null;

    try {
      if (termo) {
        const response = await produtoService.buscar(termo);
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível buscar produtos.');
          setProdutos([]);
          return;
        }
        setProdutos(response.dados.produtos ?? []);
        return;
      }

      const response = await produtoService.listar({ limit: LISTAR_LIMIT });
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar os produtos.');
        setProdutos([]);
        return;
      }
      setProdutos(response.dados.data ?? []);
      setHasNextPage(response.dados.meta.hasNextPage);
      nextCursorRef.current = response.dados.meta.nextCursor;
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar os produtos.');
      setProdutos([]);
      setHasNextPage(false);
      nextCursorRef.current = null;
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarMais = useCallback(async () => {
    if (buscaRef.current || !nextCursorRef.current) return;

    const cursor = nextCursorRef.current;
    setLoadingMore(true);

    try {
      const response = await produtoService.listar({
        limit: LISTAR_LIMIT,
        cursor,
      });
      if (!response.sucesso || !response.dados) return;

      const novos = response.dados.data ?? [];
      setProdutos((atual) => {
        const ids = new Set(atual.map((item) => item.id));
        return [...atual, ...novos.filter((item) => !ids.has(item.id))];
      });
      setHasNextPage(response.dados.meta.hasNextPage);
      nextCursorRef.current = response.dados.meta.nextCursor;
    } catch {
      return;
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void carregar(busca);
  }, [busca, carregar]);

  const sentinelRef = useInfiniteScroll({
    enabled: hasNextPage && !loading && !loadingMore && !busca,
    onLoadMore: carregarMais,
  });

  function handleNovo() {
    setProdutoEditar(null);
    setDrawerOpen(true);
  }

  function handleEdit(produto: Produto) {
    setProdutoEditar(produto);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setProdutoEditar(null);
  }

  function handleSaved(produto: Produto) {
    if (produtoEditar) {
      setProdutos((atual) =>
        atual.map((item) => (item.id === produto.id ? produto : item)),
      );
      return;
    }

    if (buscaRef.current) {
      void carregar(buscaRef.current);
      return;
    }

    setProdutos((atual) => {
      if (atual.some((item) => item.id === produto.id)) return atual;
      return [produto, ...atual];
    });
  }

  async function handleConfirmDelete() {
    if (!produtoExcluir) return;
    setDeleting(true);
    try {
      await produtoService.deletar(produtoExcluir.id);
      setProdutos((atual) =>
        atual.filter((item) => item.id !== produtoExcluir.id),
      );
      setProdutoExcluir(null);
    } catch {
      return;
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CardapioHeader onNovo={handleNovo} />
      <CardapioSearch value={buscaInput} onChange={setBuscaInput} />
      <CardapioLista
        produtos={produtos}
        loading={showSkeleton}
        loadingMore={showMoreSkeleton}
        pending={loading && produtos.length === 0 && !showSkeleton}
        hasNextPage={hasNextPage && !busca}
        erro={erro}
        buscaAtiva={Boolean(busca)}
        sentinelRef={sentinelRef}
        onEdit={handleEdit}
        onDelete={setProdutoExcluir}
      />

      <ProdutoFormDrawer
        open={drawerOpen}
        produto={produtoEditar}
        onClose={handleCloseDrawer}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(produtoExcluir)}
        title={
          produtoExcluir
            ? `Excluir ${produtoExcluir.nome}?`
            : 'Excluir produto?'
        }
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        onCancel={() => {
          if (!deleting) setProdutoExcluir(null);
        }}
      />
    </div>
  );
}
