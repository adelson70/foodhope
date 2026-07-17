import { create } from 'zustand';

export type CarrinhoAdicional = {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
};

export type CarrinhoItem = {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  qtd: number;
  adicionais: CarrinhoAdicional[];
  observacao?: string;
};

type CarrinhoState = {
  itens: CarrinhoItem[];
  totalItens: number;
  addItem: (item: Omit<CarrinhoItem, 'id'>) => void;
  clear: () => void;
};

function somarQtds(itens: CarrinhoItem[]): number {
  return itens.reduce((acc, item) => acc + item.qtd, 0);
}

export const useCarrinhoStore = create<CarrinhoState>((set, get) => ({
  itens: [],
  totalItens: 0,
  addItem: (item) => {
    const next = [
      ...get().itens,
      { ...item, id: crypto.randomUUID() },
    ];
    set({ itens: next, totalItens: somarQtds(next) });
  },
  clear: () => set({ itens: [], totalItens: 0 }),
}));
