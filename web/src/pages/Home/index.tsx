import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type CardapioAdicionalEvento,
  type CardapioProdutoEvento,
} from '../../hooks/useCardapioCarrinhoRealtime';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDeferredLoading } from '../../hooks/useDeferredLoading';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { getApiErrorMensagens, produtoService, socket } from '../../services';
import type { Produto, ProdutoCategoria } from '../../services/types';
import {
  HOME_CATEGORIA_OUTROS,
  homeCategoriaAnchorId,
  HomeCategoriaPills,
  type HomeCategoriaPill,
} from './HomeCategoriaPills';
import { HomeLista } from './HomeLista';
import { HomeProdutoDrawer } from './HomeProdutoDrawer';
import { HomeSearch } from './HomeSearch';
import { HomeSkeleton } from './HomeSkeleton';

const LISTAR_LIMIT = 20;
const SCROLL_SPY_PAD = 8;

function aplicarProdutoAtivo(
  produto: Produto,
  payload: CardapioProdutoEvento,
): Produto {
  if (produto.id !== payload.id) return produto;
  return { ...produto, ativo: payload.ativo };
}

function aplicarAdicionalAtivo(
  produto: Produto,
  payload: CardapioAdicionalEvento,
): Produto {
  if (payload.escopo === 'produto' && payload.produtoId !== produto.id) {
    return produto;
  }

  const patchLista = <T extends { id: string; ativo?: boolean }>(
    lista: T[] | undefined,
  ): T[] | undefined => {
    if (!lista) return lista;
    return lista.map((item) =>
      item.id === payload.id ? { ...item, ativo: payload.ativo } : item,
    );
  };

  return {
    ...produto,
    adicionais: patchLista(produto.adicionais),
    adicionaisEspecificos: patchLista(produto.adicionaisEspecificos),
  };
}

function montarPills(
  categorias: ProdutoCategoria[],
  temOutros: boolean,
): HomeCategoriaPill[] {
  const pills = categorias.map((item) => ({
    id: item.id,
    nome: item.nome,
  }));
  if (temOutros) {
    pills.push({ id: HOME_CATEGORIA_OUTROS, nome: 'Outros' });
  }
  return pills;
}

function getScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-scroll-root]');
}

function getStickyOffset(): number {
  const sticky = document.querySelector<HTMLElement>('[data-home-sticky]');
  return sticky?.offsetHeight ?? 144;
}

function scrollParaSecao(categoriaId: string) {
  const root = getScrollRoot();
  const el = document.getElementById(homeCategoriaAnchorId(categoriaId));
  if (!root || !el) return false;

  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const top =
    root.scrollTop + (elRect.top - rootRect.top) - getStickyOffset();

  root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  return true;
}

function scrollPillIntoView(categoriaId: string) {
  const pill = document.querySelector<HTMLElement>(
    `[data-home-pill="${CSS.escape(categoriaId)}"]`,
  );
  const track = pill?.parentElement;
  if (!pill || !track) return;

  const left =
    pill.offsetLeft - track.clientWidth / 2 + pill.clientWidth / 2;
  track.scrollTo({
    left: Math.max(0, left),
    behavior: 'smooth',
  });
}

function categoriaAtivaNoScroll(): string | null {
  const root = getScrollRoot();
  if (!root) return null;

  const secoes = Array.from(
    document.querySelectorAll<HTMLElement>('[data-home-categoria]'),
  );
  if (secoes.length === 0) return null;

  const limite =
    root.getBoundingClientRect().top + getStickyOffset() + SCROLL_SPY_PAD;
  let ativoId = secoes[0].dataset.homeCategoria ?? null;

  for (let i = 0; i < secoes.length; i++) {
    const secao = secoes[i];
    const id = secao.dataset.homeCategoria;
    if (!id) continue;

    const rect = secao.getBoundingClientRect();
    const meio = rect.top + rect.height / 2;

    if (meio <= limite) {
      const proxima = secoes[i + 1];
      ativoId = proxima?.dataset.homeCategoria ?? id;
      continue;
    }

    if (rect.top <= limite) {
      ativoId = id;
    }
    break;
  }

  return ativoId;
}

export function Home() {
  const [buscaInput, setBuscaInput] = useState('');
  const busca = useDebouncedValue(buscaInput.trim());
  const [pills, setPills] = useState<HomeCategoriaPill[]>([]);
  const [pillAtiva, setPillAtiva] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(
    null,
  );
  const initialPending = loading && produtos.length === 0;
  const showSkeleton = useDeferredLoading(initialPending);
  const showMoreSkeleton = useDeferredLoading(loadingMore);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  const nextCursorRef = useRef<string | null>(null);
  const pendingScrollRef = useRef<string | null>(null);
  const hasNextPageRef = useRef(false);
  hasNextPageRef.current = hasNextPage;
  const scrollAlvoRef = useRef<string | null>(null);
  const scrollAlvoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pillAtivaRef = useRef<string | null>(null);
  pillAtivaRef.current = pillAtiva;

  const liberarScrollAlvo = useCallback(() => {
    scrollAlvoRef.current = null;
    if (scrollAlvoTimerRef.current) {
      clearTimeout(scrollAlvoTimerRef.current);
      scrollAlvoTimerRef.current = null;
    }
  }, []);

  const travarScrollAlvo = useCallback(
    (categoriaId: string) => {
      scrollAlvoRef.current = categoriaId;
      if (scrollAlvoTimerRef.current) {
        clearTimeout(scrollAlvoTimerRef.current);
      }
      scrollAlvoTimerRef.current = setTimeout(() => {
        scrollAlvoRef.current = null;
        scrollAlvoTimerRef.current = null;
      }, 1500);
    },
    [],
  );

  const marcarPill = useCallback((categoriaId: string) => {
    if (pillAtivaRef.current === categoriaId) return;
    setPillAtiva(categoriaId);
    scrollPillIntoView(categoriaId);
  }, []);

  const carregar = useCallback(async (termo: string) => {
    setLoading(true);
    setErro(null);
    setHasNextPage(false);
    nextCursorRef.current = null;
    pendingScrollRef.current = null;
    liberarScrollAlvo();

    try {
      if (termo) {
        const response = await produtoService.buscar(termo);
        if (!response.sucesso || !response.dados) {
          setErro('Não foi possível buscar o cardápio.');
          setProdutos([]);
          return;
        }
        setProdutos(response.dados.produtos ?? []);
        return;
      }

      const response = await produtoService.listar({ limit: LISTAR_LIMIT });
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar o cardápio.');
        setProdutos([]);
        return;
      }
      setProdutos(response.dados.data ?? []);
      setHasNextPage(response.dados.meta.hasNextPage);
      nextCursorRef.current = response.dados.meta.nextCursor;
      if (response.dados.meta.categorias) {
        const proximas = montarPills(
          response.dados.meta.categorias,
          Boolean(response.dados.meta.temOutros),
        );
        setPills(proximas);
        if (proximas[0] && !pillAtivaRef.current) {
          setPillAtiva(proximas[0].id);
        }
      }
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar o cardápio.');
      setProdutos([]);
      setHasNextPage(false);
      nextCursorRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [liberarScrollAlvo]);

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

  useEffect(() => {
    function onProduto(payload: CardapioProdutoEvento) {
      if (!payload?.id) return;
      setProdutos((atual) =>
        atual.map((produto) => aplicarProdutoAtivo(produto, payload)),
      );
      setProdutoSelecionado((atual) =>
        atual ? aplicarProdutoAtivo(atual, payload) : atual,
      );
    }

    function onAdicional(payload: CardapioAdicionalEvento) {
      if (!payload?.id) return;
      setProdutos((atual) =>
        atual.map((produto) => aplicarAdicionalAtivo(produto, payload)),
      );
      setProdutoSelecionado((atual) =>
        atual ? aplicarAdicionalAtivo(atual, payload) : atual,
      );
    }

    socket.on('cardapio:produto', onProduto);
    socket.on('cardapio:adicional', onAdicional);
    return () => {
      socket.off('cardapio:produto', onProduto);
      socket.off('cardapio:adicional', onAdicional);
    };
  }, []);

  useEffect(() => {
    const alvo = pendingScrollRef.current;
    if (!alvo || loadingMore) return;

    if (scrollParaSecao(alvo)) {
      pendingScrollRef.current = null;
      travarScrollAlvo(alvo);
      return;
    }

    if (hasNextPageRef.current) {
      void carregarMais();
      return;
    }

    pendingScrollRef.current = null;
  }, [produtos, loadingMore, carregarMais, travarScrollAlvo]);

  useEffect(() => {
    if (busca || pills.length === 0 || produtos.length === 0) return;

    const root = getScrollRoot();
    if (!root) return;

    const sincronizar = () => {
      const ativoId = categoriaAtivaNoScroll();
      if (!ativoId) return;

      if (scrollAlvoRef.current) {
        if (ativoId === scrollAlvoRef.current) {
          liberarScrollAlvo();
        }
        return;
      }

      marcarPill(ativoId);
    };

    sincronizar();
    root.addEventListener('scroll', sincronizar, { passive: true });
    return () => root.removeEventListener('scroll', sincronizar);
  }, [busca, pills, produtos, marcarPill, liberarScrollAlvo]);

  const sentinelRef = useInfiniteScroll({
    enabled:
      hasNextPage &&
      !loading &&
      !loadingMore &&
      !busca &&
      !pendingScrollRef.current,
    onLoadMore: carregarMais,
  });

  function handlePillSelect(categoriaId: string) {
    travarScrollAlvo(categoriaId);
    marcarPill(categoriaId);
    if (scrollParaSecao(categoriaId)) {
      pendingScrollRef.current = null;
      return;
    }
    pendingScrollRef.current = categoriaId;
    if (hasNextPage && !loadingMore && !busca) {
      void carregarMais();
    }
  }

  return (
    <div className="flex flex-col">
      <div
        data-home-sticky=""
        className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3"
      >
        <div className="flex flex-col gap-3">
          <HomeSearch value={buscaInput} onChange={setBuscaInput} />
          {!busca ? (
            <HomeCategoriaPills
              pills={pills}
              ativoId={pillAtiva}
              onSelect={handlePillSelect}
            />
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-4">
        {showSkeleton ? (
          <HomeSkeleton />
        ) : initialPending ? (
          <div
            className="min-h-40"
            aria-busy="true"
            aria-label="Carregando cardápio"
          />
        ) : (
          <HomeLista
            produtos={produtos}
            loadingMore={showMoreSkeleton}
            hasNextPage={hasNextPage && !busca}
            erro={erro}
            buscaAtiva={Boolean(busca)}
            sentinelRef={sentinelRef}
            onSelect={setProdutoSelecionado}
          />
        )}
      </div>

      <HomeProdutoDrawer
        produto={produtoSelecionado}
        open={Boolean(produtoSelecionado)}
        onClose={() => setProdutoSelecionado(null)}
      />
    </div>
  );
}
