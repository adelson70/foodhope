export const LARGURA_CUPOM = 48;

export function formatarMoeda(valor: number | string): string {
  return Number(valor)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ');
}

export function alinharLinha(
  textoEsq: string,
  textoDir: string,
  preenchimento = '.',
  tamanhoTotal = LARGURA_CUPOM,
): string {
  const espacoLivre = tamanhoTotal - textoDir.length;
  let textoLimitado = textoEsq;

  if (textoEsq.length > espacoLivre - 1) {
    textoLimitado = textoEsq.substring(0, espacoLivre - 2) + preenchimento;
  }

  const quantidadePreenchimento =
    tamanhoTotal - textoLimitado.length - textoDir.length;
  const caracteresPreenchimento = preenchimento.repeat(
    quantidadePreenchimento > 0 ? quantidadePreenchimento : 0,
  );

  return `${textoLimitado}${caracteresPreenchimento}${textoDir}`;
}

export function linhaSeparadora(char = '='): string {
  return char.repeat(LARGURA_CUPOM);
}

type ItemRankRelatorio = {
  nome: string;
  quantidade: number;
};

type RelatorioDiaInput = {
  data: string;
  faturamento: number;
  pedidos: number;
  topProdutos: ItemRankRelatorio[];
  topAdicionais: ItemRankRelatorio[];
  geradoEm: Date;
};

function formatarHorarioSp(data: Date): string {
  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarDataSp(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-');
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

function formatarRanking(itens: ItemRankRelatorio[]): string {
  if (itens.length === 0) {
    return 'Nenhum no periodo\n';
  }

  let texto = '';
  itens.forEach((item, index) => {
    const posicao = index + 1;
    const esq = `${posicao}. ${item.nome} `;
    const dir = ` ${item.quantidade}`;
    texto += alinharLinha(esq, dir, '.') + '\n';
  });
  return texto;
}

export function formatarRelatorioDia(input: RelatorioDiaInput): string {
  let impressao = '';

  impressao += `${linhaSeparadora('=')}\n`;
  impressao += 'FOOD HOPE - RELATORIO DO DIA\n';
  impressao += `Data: ${formatarDataSp(input.data)}\n`;
  impressao += `Gerado: ${formatarHorarioSp(input.geradoEm)}\n`;
  impressao += `${linhaSeparadora('=')}\n`;
  impressao +=
    alinharLinha(
      'TOTAL DE VENDAS ',
      ` ${formatarMoeda(input.faturamento)}`,
      '.',
    ) + '\n';
  impressao +=
    alinharLinha('PEDIDOS ', ` ${input.pedidos}`, '.') + '\n';
  impressao += `${linhaSeparadora('-')}\n`;
  impressao += 'TOP 5 PRODUTOS\n';
  impressao += formatarRanking(input.topProdutos);
  impressao += `${linhaSeparadora('-')}\n`;
  impressao += 'TOP 5 ADICIONAIS\n';
  impressao += formatarRanking(input.topAdicionais);
  impressao += `${linhaSeparadora('=')}\n`;
  impressao += '\n\n\n';

  return impressao;
}

type PedidoRelatorio = {
  nome: string;
  valor: number;
};

type RelatorioCompletoInput = {
  data: string;
  faturamento: number;
  pedidos: PedidoRelatorio[];
  geradoEm: Date;
};

function formatarListaPedidos(itens: PedidoRelatorio[]): string {
  if (itens.length === 0) {
    return 'Nenhum pedido no periodo\n';
  }

  let texto = '';
  itens.forEach((item) => {
    const esq = `${item.nome} `;
    const dir = ` ${formatarMoeda(item.valor)}`;
    texto += alinharLinha(esq, dir, '.') + '\n';
  });
  return texto;
}

export function formatarRelatorioCompleto(
  input: RelatorioCompletoInput,
): string {
  let impressao = '';

  impressao += `${linhaSeparadora('=')}\n`;
  impressao += 'FOOD HOPE - RELATORIO COMPLETO\n';
  impressao += `Data: ${formatarDataSp(input.data)}\n`;
  impressao += `Gerado: ${formatarHorarioSp(input.geradoEm)}\n`;
  impressao += `${linhaSeparadora('=')}\n`;
  impressao += 'PEDIDOS\n';
  impressao += formatarListaPedidos(input.pedidos);
  impressao += `${linhaSeparadora('-')}\n`;
  impressao +=
    alinharLinha(
      'TOTAL ',
      ` ${formatarMoeda(input.faturamento)}`,
      '.',
    ) + '\n';
  impressao +=
    alinharLinha('QTD PEDIDOS ', ` ${input.pedidos.length}`, '.') + '\n';
  impressao += `${linhaSeparadora('=')}\n`;
  impressao += '\n\n\n';

  return impressao;
}
