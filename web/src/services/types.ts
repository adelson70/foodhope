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
  ativo?: boolean;
};

export type AdicionalGlobal = {
  id: string;
  nome: string;
  preco: string | number;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Categoria = {
  id: string;
  nome: string;
  ordem: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProdutoCategoria = {
  id: string;
  nome: string;
  ordem: number;
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string | number;
  imagemUrl: string | null;
  ativo?: boolean;
  imprimirSeparado?: boolean;
  ordem?: number;
  categoria?: ProdutoCategoria | null;
  createdAt?: string;
  updatedAt?: string;
  adicionais?: Adicional[];
  adicionaisEspecificos?: Adicional[];
  adicionalGlobalIds?: string[];
};

export type CursorMeta = {
  hasNextPage: boolean;
  nextCursor: string | null;
  categorias?: ProdutoCategoria[];
  temOutros?: boolean;
};

export type LoginPayload = {
  nome: string;
  senha: string;
};

export type EditarOperadorInput = {
  nome?: string;
  senha?: string;
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
  ativo?: boolean;
};

export type AdicionalEditarInput = {
  id?: string;
  foiDeletado?: boolean;
  nome?: string;
  preco?: number;
  ativo?: boolean;
};

export type CriarAdicionalGlobalInput = {
  nome: string;
  preco: number;
};

export type EditarAdicionalGlobalInput = {
  nome?: string;
  preco?: number;
  ativo?: boolean;
};

export type ListarAdicionaisGlobaisDados = {
  adicionais: AdicionalGlobal[];
};

export type CriarCategoriaInput = {
  nome: string;
};

export type EditarCategoriaInput = {
  nome?: string;
  ordem?: number;
};

export type ListarCategoriasDados = {
  categorias: Categoria[];
};

export type CriarProdutoInput = {
  nome: string;
  descricao?: string;
  preco: number;
  ativo?: boolean;
  imprimirSeparado?: boolean;
  categoriaId?: string | null;
  adicionais?: AdicionalCriarInput[];
  adicionalGlobalIds?: string[];
  imagem?: File;
};

export type EditarProdutoInput = {
  nome?: string;
  descricao?: string;
  preco?: number;
  ativo?: boolean;
  imprimirSeparado?: boolean;
  ordem?: number;
  categoriaId?: string | null;
  adicionais?: AdicionalEditarInput[];
  adicionalGlobalIds?: string[];
  imagem?: File;
  removerImagem?: boolean;
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

export type TipoConsumo = 'LEVAR' | 'COMER_AQUI';

export type Pedido = {
  id: string;
  numero: string;
  nome_completo: string;
  tipo_consumo?: TipoConsumo;
  createdAt?: string;
  updatedAt?: string;
  itens?: PedidoItem[];
};

export type ClientePedidoInput = {
  primeiro_nome: string;
  sobrenome?: string;
  contato?: string;
  cidade?: string;
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
  tipo_consumo?: TipoConsumo;
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

export type DashItemRank = {
  produtoId?: string;
  adicionalId?: string;
  nome: string;
  quantidade: number;
};

export type DashDados = {
  faturamentoHoje: number;
  comprasHoje: number;
  leadsTotal: number;
  produtoMaisVendido: DashItemRank | null;
  adicionalMaisVendido: DashItemRank | null;
  topProdutos: DashItemRank[];
  topAdicionais: DashItemRank[];
};

export type ConfigImpressora = {
  ip: string | null;
  dispositivo: string | null;
};

export type PortaImpressora = {
  path: string;
  label: string;
};

export type TestarImpressoraDados = {
  conectada: boolean;
  ip: string | null;
  dispositivo: string | null;
};

export type ConfigurarImpressoraInput = {
  ip?: string;
  dispositivo?: string;
};
