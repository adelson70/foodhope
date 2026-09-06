export type CarrinhoAdicional = {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
};

export type CarrinhoRetirada = {
  id: string;
  nome: string;
};

export type CarrinhoItem = {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  qtd: number;
  adicionais: CarrinhoAdicional[];
  retirar?: CarrinhoRetirada[];
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
  retirar?: Array<{
    nome: string;
  }>;
  observacao?: string;
};

export type PedidoLocal = {
  id: string;
  numero: string;
  nome_completo: string;
  tipo_consumo?: 'LEVAR' | 'COMER_AQUI';
  pronto?: boolean;
  prontoAt?: string | null;
  createdAt: string;
  itens: PedidoLocalItem[];
};

export type ClienteLocal = {
  primeiro_nome: string;
  sobrenome: string;
  contato: string;
  cidade: string;
};
