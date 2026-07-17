import { useCallback, useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ui';
import {
  getApiErrorMensagens,
  produtoService,
} from '../../../services';
import type { Produto } from '../../../services/types';
import { CardapioHeader } from './CardapioHeader';
import { CardapioLista } from './CardapioLista';
import { CardapioSearch } from './CardapioSearch';
import { ProdutoFormDrawer } from './ProdutoFormDrawer';

const LISTAR_LIMIT = 50;
const BUSCA_DEBOUNCE_MS = 300;

export function Cardapio() {
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [produtoEditar, setProdutoEditar] = useState<Produto | null>(null);
  const [produtoExcluir, setProdutoExcluir] = useState<Produto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusca(buscaInput.trim());
    }, BUSCA_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [buscaInput]);

  const carregar = useCallback(async (termo: string) => {
    setLoading(true);
    setErro(null);

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
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar os produtos.');
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar(busca);
  }, [busca, carregar]);

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
        loading={loading}
        erro={erro}
        buscaAtiva={Boolean(busca)}
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
