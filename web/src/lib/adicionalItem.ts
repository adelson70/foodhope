import { formatarMoeda } from './currency';

/**
 * Texto de um adicional de item já gravado. No pedido, `qtd` do adicional é o total da linha
 * (por lanche × quantidade de lanches). Se divide pela quantidade, vale para cada lanche e aparece
 * como no carrinho ("+ Frango", "+ 2× Bacon"). Pedidos antigos, em que o adicional era total para a
 * linha (ex.: 2 lanches + 1 frango), mostram isso por extenso.
 */
export function rotuloAdicional(
  adicional: { nome: string; qtd: number; preco?: number | string | null },
  qtdItem: number,
): string {
  const qtd = Number(adicional.qtd) || 0;
  const lanches = Math.max(1, Number(qtdItem) || 1);
  if (qtd % lanches === 0) {
    const porLanche = qtd / lanches;
    return `+ ${porLanche > 1 ? `${porLanche}× ` : ''}${adicional.nome}`;
  }
  const preco = Number(adicional.preco) || 0;
  return `+ ${qtd}× ${adicional.nome} para os ${lanches}${preco > 0 ? ` (${formatarMoeda(preco * qtd)})` : ''}`;
}
