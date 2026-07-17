export type ApiResponse<T> = {
  sucesso: boolean;
  mensagens: string[];
  dados: T;
  statusCode: number;
};

export type ApiErrorBody = {
  sucesso: false;
  mensagens: string[];
  dados: null;
  statusCode: number;
};

export type Operador = {
  id: string;
  nome: string;
};

export type Adicional = {
  id: string;
  nome: string;
  preco: string | number;
  produto_id?: string;
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string | number;
  imagemUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
  adicionais?: Adicional[];
};

export type CursorMeta = {
  hasNextPage: boolean;
  nextCursor: string | null;
};

export type LoginPayload = {
  nome: string;
  senha: string;
};

export type LoginDados = {
  access_token: string;
  operador: Operador;
};

export type LogoutDados = {
  message: string;
};

export type AdicionalCriarInput = {
  nome: string;
  preco: number;
};

export type AdicionalEditarInput = {
  id?: string;
  foiDeletado?: boolean;
  nome?: string;
  preco?: number;
};

export type CriarProdutoInput = {
  nome: string;
  descricao?: string;
  preco: number;
  adicionais?: AdicionalCriarInput[];
  imagem?: File;
};

export type EditarProdutoInput = {
  nome?: string;
  descricao?: string;
  preco?: number;
  adicionais?: AdicionalEditarInput[];
  imagem?: File;
};

export type ListarProdutosDados = {
  data: Produto[];
  meta: CursorMeta;
};

export type BuscarProdutosDados = {
  produtos: Produto[];
};

export type AdicionalVenda = {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
};

export type PedidoItem = {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  preco_produto: string | number;
  adicional_venda: AdicionalVenda[] | null;
  observacao: string | null;
  createdAt?: string;
  updatedAt?: string;
  produto?: Produto;
};

export type Pedido = {
  id: string;
  numero: string;
  nome_completo: string;
  createdAt?: string;
  updatedAt?: string;
  itens?: PedidoItem[];
};

export type ClientePedidoInput = {
  primeiro_nome: string;
  sobrenome: string;
  contato: string;
};

export type AdicionalPedidoInput = {
  id: string;
  qtd: number;
};

export type ItemPedidoInput = {
  id: string;
  qtd: number;
  adicional?: AdicionalPedidoInput[];
  observacao?: string;
};

export type CriarPedidoInput = {
  itens: ItemPedidoInput[];
  cliente: ClientePedidoInput;
};

export type ListarPedidosDados = {
  pedidos: Pedido[];
  meta: CursorMeta;
};

export type BuscarPedidosDados = {
  pedidos: Pedido[];
};

export type CriarPedidoDados = {
  pedido: Pedido;
};
