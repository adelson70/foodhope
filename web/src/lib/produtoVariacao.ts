import type { PedidoItem, Produto, VariacaoProduto } from '../services/types';

export function produtoVariavel(produto: Produto | null | undefined): boolean {
  return produto?.tipo === 'VARIAVEL';
}

export function variacoesAtivas(
  produto: Produto | null | undefined,
): VariacaoProduto[] {
  if (!produtoVariavel(produto)) return [];
  return (produto?.variacoes ?? []).filter((item) => item.ativo !== false);
}

/** Preço para o card: "a partir de" quando as variações ativas têm preços diferentes. */
export function precoExibicao(produto: Produto): {
  valor: number;
  aPartirDe: boolean;
} {
  const ativas = variacoesAtivas(produto);
  if (ativas.length === 0) {
    return { valor: Number(produto.preco), aPartirDe: false };
  }
  const precos = ativas.map((item) => Number(item.preco));
  const menor = Math.min(...precos);
  return { valor: menor, aPartirDe: precos.some((preco) => preco !== menor) };
}

export function nomeComVariacao(
  nomeProduto: string,
  variacaoNome?: string | null,
): string {
  return variacaoNome ? `${nomeProduto} - ${variacaoNome}` : nomeProduto;
}

export function nomeItemPedido(item: PedidoItem): string {
  return nomeComVariacao(item.produto?.nome ?? 'Item', item.variacao_nome);
}

/** Imagem do card: a do produto ou, se não houver, a da primeira variação ativa com foto. */
export function imagemCapaProduto(produto: Produto): {
  imagemUrl: string | null;
  cacheKey?: string;
} {
  if (produto.imagemUrl) {
    return { imagemUrl: produto.imagemUrl, cacheKey: produto.updatedAt };
  }
  const comFoto = variacoesAtivas(produto).find((item) => item.imagemUrl);
  return comFoto
    ? { imagemUrl: comFoto.imagemUrl, cacheKey: comFoto.updatedAt }
    : { imagemUrl: null };
}

/** Imagem da visualização: a da variação escolhida, com fallback para a do produto. */
export function imagemVariacaoOuProduto(
  produto: Produto,
  variacao: VariacaoProduto | null | undefined,
): { imagemUrl: string | null; cacheKey?: string } {
  if (variacao?.imagemUrl) {
    return { imagemUrl: variacao.imagemUrl, cacheKey: variacao.updatedAt };
  }
  return { imagemUrl: produto.imagemUrl, cacheKey: produto.updatedAt };
}
