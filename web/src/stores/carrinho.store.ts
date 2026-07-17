import { create } from 'zustand';

import { loadCarrinho, saveCarrinho } from '../lib/clienteStorage';
import type { CarrinhoAdicional, CarrinhoItem } from '../lib/clienteTypes';
import { getVisitorId } from '../services/visitor';

export type { CarrinhoAdicional, CarrinhoItem };

type CarrinhoState = {
  itens: CarrinhoItem[];
  totalItens: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addItem: (item: Omit<CarrinhoItem, 'id'>) => void;
  setQtd: (id: string, qtd: number) => void;
  removeItem: (id: string) => void;
  removeByProdutoId: (produtoId: string) => void;
  removeAdicionalId: (adicionalId: string) => void;
  clear: () => void;
};

function somarQtds(itens: CarrinhoItem[]): number {
  return itens.reduce((acc, item) => acc + item.qtd, 0);
}

async function persist(itens: CarrinhoItem[]) {
  const visitorId = await getVisitorId();
  if (!visitorId) return;
  await saveCarrinho(visitorId, itens);
}

export const useCarrinhoStore = create<CarrinhoState>((set, get) => ({
  itens: [],
  totalItens: 0,
  hydrated: false,
  hydrate: async () => {
    const visitorId = await getVisitorId();
    if (!visitorId) {
      set({ itens: [], totalItens: 0, hydrated: true });
      return;
    }
    const itens = await loadCarrinho(visitorId);
    set({ itens, totalItens: somarQtds(itens), hydrated: true });
  },
  addItem: (item) => {
    const next = [...get().itens, { ...item, id: crypto.randomUUID() }];
    set({ itens: next, totalItens: somarQtds(next) });
    void persist(next);
  },
  setQtd: (id, qtd) => {
    let next: CarrinhoItem[];
    if (qtd < 1) {
      next = get().itens.filter((item) => item.id !== id);
    } else {
      next = get().itens.map((item) =>
        item.id === id ? { ...item, qtd } : item,
      );
    }
    set({ itens: next, totalItens: somarQtds(next) });
    void persist(next);
  },
  removeItem: (id) => {
    const next = get().itens.filter((item) => item.id !== id);
    set({ itens: next, totalItens: somarQtds(next) });
    void persist(next);
  },
  removeByProdutoId: (produtoId) => {
    const next = get().itens.filter((item) => item.produtoId !== produtoId);
    if (next.length === get().itens.length) return;
    set({ itens: next, totalItens: somarQtds(next) });
    void persist(next);
  },
  removeAdicionalId: (adicionalId) => {
    const next = get().itens.map((item) => ({
      ...item,
      adicionais: item.adicionais.filter((a) => a.id !== adicionalId),
    }));
    const mudou = next.some(
      (item, index) =>
        item.adicionais.length !== get().itens[index]?.adicionais.length,
    );
    if (!mudou) return;
    set({ itens: next, totalItens: somarQtds(next) });
    void persist(next);
  },
  clear: () => {
    set({ itens: [], totalItens: 0 });
    void persist([]);
  },
}));

export function totalItemCarrinho(item: CarrinhoItem): number {
  const base = item.preco * item.qtd;
  const adicionais = item.adicionais.reduce(
    (soma, adicional) => soma + adicional.preco * adicional.qtd,
    0,
  );
  return base + adicionais;
}

export function totalCarrinho(itens: CarrinhoItem[]): number {
  return itens.reduce((soma, item) => soma + totalItemCarrinho(item), 0);
}
