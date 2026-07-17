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

export type PedidoLocalItem = {
  nome: string;
  qtd: number;
  preco: number;
  adicionais: Array<{
    nome: string;
    preco: number;
    qtd: number;
  }>;
  observacao?: string;
};

export type PedidoLocal = {
  id: string;
  numero: string;
  nome_completo: string;
  createdAt: string;
  itens: PedidoLocalItem[];
};

export type ClienteLocal = {
  primeiro_nome: string;
  sobrenome: string;
  contato: string;
  cidade: string;
};
