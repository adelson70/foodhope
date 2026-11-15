export const LARGURA_CUPOM = 42;

export const MARCA_BIG_ABRE = '[[BIG]]';
export const MARCA_BIG_FECHA = '[[/BIG]]';
export const MARCA_ITEM_ABRE = '[[ITEM]]';
export const MARCA_ITEM_FECHA = '[[/ITEM]]';
export const MARCA_OBS_ABRE = '[[OBS]]';
export const MARCA_OBS_FECHA = '[[/OBS]]';
export const MARCA_BANNER_ABRE = '[[BANNER]]';
export const MARCA_BANNER_FECHA = '[[/BANNER]]';
export const MARCA_CENTER_ABRE = '[[CENTER]]';
export const MARCA_CENTER_FECHA = '[[/CENTER]]';
export const MARCA_META_ABRE = '[[META]]';
export const MARCA_META_FECHA = '[[/META]]';
export const MARCA_TOTAL_ABRE = '[[TOTAL]]';
export const MARCA_TOTAL_FECHA = '[[/TOTAL]]';

export function paraCupom(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
}

export function linhaNumeroPedido(numero: string | number | bigint): string {
  return `${MARCA_BIG_ABRE}#${numero}${MARCA_BIG_FECHA}`;
}

export function linhaCentralizada(texto: string): string {
  return `${MARCA_CENTER_ABRE}${paraCupom(texto)}${MARCA_CENTER_FECHA}`;
}

export function linhaMetaCupom(texto: string): string {
  return `${MARCA_META_ABRE}${paraCupom(texto)}${MARCA_META_FECHA}`;
}

export function linhaBanner(texto: string): string {
  return `${MARCA_BANNER_ABRE}${paraCupom(texto)}${MARCA_BANNER_FECHA}`;
}

export function linhaItemCupom(quantidade: number, nome: string, valor: number | string): string {
  const esq = `${quantidade}X ${paraCupom(nome)}`;
  const dir = ` ${formatarMoeda(valor)}`;
  return `${MARCA_ITEM_ABRE}${alinharLinha(esq, dir, ' ')}${MARCA_ITEM_FECHA}`;
}

export function linhaAdicionalCupom(nome: string, valor: number | string, qtd = 1): string {
  const qtdLabel = qtd > 1 ? `${qtd}X ` : '';
  const esq = `  + ${qtdLabel}${paraCupom(nome)}`;
  const dir = ` ${formatarMoeda(valor)}`;
  return alinharLinha(esq, dir, ' ');
}

export function linhaObsCupom(texto: string): string {
  return `${MARCA_OBS_ABRE}OBS: ${paraCupom(texto.trim())}${MARCA_OBS_FECHA}`;
}

export function montarTextoObservacaoCupom(item: {
  observacao?: string | null;
  retirada_venda?: unknown;
}): string {
  const partes: string[] = [];
  const retiradas = Array.isArray(item.retirada_venda)
    ? item.retirada_venda
        .map((r: { nome?: string }) => (typeof r?.nome === 'string' ? r.nome.trim() : ''))
        .filter((nome) => nome.length > 0)
    : [];

  if (retiradas.length > 0) {
    partes.push(retiradas.map((nome) => `SEM ${nome}`).join(', '));
  }

  const obs = item.observacao?.trim();
  if (obs) {
    partes.push(obs);
  }

  return partes.join(' | ');
}

type AdicionalCupom = { nome?: string; qtd?: number | string; preco?: number | string };

/**
 * Bloco de um item no cupom. O `qtd` de cada adicional é o total da linha (por lanche × quantidade).
 * Quando todos dividem pela quantidade, o adicional é "por lanche": o cupom mostra o total da linha
 * no item e lista o adicional sem preço (vale para cada um). Pedidos antigos, com adicional total
 * que não divide (ex.: 2 lanches + 1 frango), saem no formato antigo, com quantidade e preço.
 */
export function blocoItemCupom(item: {
  quantidade: number;
  nome: string;
  precoUnitario: number | string;
  adicionais?: unknown;
  retirada_venda?: unknown;
  observacao?: string | null;
}): { texto: string; total: number } {
  const qtdItem = Math.max(1, Number(item.quantidade) || 1);
  const adicionais: AdicionalCupom[] = Array.isArray(item.adicionais) ? item.adicionais : [];
  const subtotalLanche = qtdItem * Number(item.precoUnitario);
  const subtotalAdicionais = adicionais.reduce(
    (soma, add) => soma + Number(add.qtd) * Number(add.preco),
    0,
  );
  const total = subtotalLanche + subtotalAdicionais;
  const porLanche = adicionais.every((add) => Number(add.qtd) % qtdItem === 0);

  const linhas: string[] = [];
  if (porLanche) {
    linhas.push(linhaItemCupom(qtdItem, item.nome, total));
    for (const add of adicionais) {
      const qtd = Number(add.qtd) / qtdItem;
      linhas.push(`  + ${qtd > 1 ? `${qtd}X ` : ''}${paraCupom(add.nome ?? '')}`);
    }
  } else {
    linhas.push(linhaItemCupom(qtdItem, item.nome, subtotalLanche));
    for (const add of adicionais) {
      const qtd = Number(add.qtd);
      linhas.push(linhaAdicionalCupom(add.nome ?? '', qtd * Number(add.preco), qtd));
    }
  }

  const retiradas = Array.isArray(item.retirada_venda)
    ? item.retirada_venda
        .map((r: { nome?: string }) => (typeof r?.nome === 'string' ? r.nome.trim() : ''))
        .filter((nome) => nome.length > 0)
    : [];
  if (retiradas.length > 0) {
    linhas.push(
      `${MARCA_OBS_ABRE}  ${paraCupom(retiradas.map((nome) => `SEM ${nome}`).join(', '))}${MARCA_OBS_FECHA}`,
    );
  }
  const obs = item.observacao?.trim();
  if (obs) linhas.push(`${MARCA_OBS_ABRE}  OBS: ${paraCupom(obs)}${MARCA_OBS_FECHA}`);

  return { texto: linhas.map((l) => `${l}\n`).join(''), total };
}

export function linhaTotalCupom(rotulo: string, valor: number | string): string {
  return `${MARCA_TOTAL_ABRE}${alinharLinha(paraCupom(rotulo), formatarMoeda(valor), ' ')}${MARCA_TOTAL_FECHA}`;
}

export function formatarHorarioCupom(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return '';
  return paraCupom(
    d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  );
}

export function formatarMoeda(valor: number | string): string {
  return paraCupom(
    Number(valor)
      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      .replace(/\u00A0/g, ' ')
      .replace(/\u202F/g, ' '),
  );
}

export function alinharLinha(
  textoEsq: string,
  textoDir: string,
  preenchimento = '.',
  tamanhoTotal = LARGURA_CUPOM,
): string {
  const dir =
    textoDir.length > tamanhoTotal ? textoDir.slice(textoDir.length - tamanhoTotal) : textoDir;
  const maxEsq = Math.max(0, tamanhoTotal - dir.length);
  let textoLimitado = textoEsq;

  if (textoLimitado.length > maxEsq) {
    const corte = Math.max(0, maxEsq - 1);
    textoLimitado = corte > 0 ? textoLimitado.slice(0, corte) + preenchimento : '';
    if (textoLimitado.length > maxEsq) {
      textoLimitado = textoLimitado.slice(0, maxEsq);
    }
  }

  const quantidadePreenchimento = maxEsq - textoLimitado.length;
  const caracteresPreenchimento = preenchimento.repeat(
    quantidadePreenchimento > 0 ? quantidadePreenchimento : 0,
  );

  return `${textoLimitado}${caracteresPreenchimento}${dir}`;
}

export function linhaSeparadora(char = '='): string {
  return char.repeat(LARGURA_CUPOM);
}

type ItemRankRelatorio = {
  nome: string;
  quantidade: number;
};

/**
 * Meio de pagamento para o papel. `meio` é o `capture_method` do InfinitePay; sem checkout online o
 * pedido foi lançado no painel/totem e pago no caixa.
 */
export function rotuloMeioPagamento(meio?: string | null, parcelas?: number | null): string {
  if (!meio) return 'CAIXA';
  if (meio === 'pix') return 'PIX';
  if (meio === 'debit_card') return 'DEBITO';
  if (meio === 'credit_card') return parcelas && parcelas > 1 ? `CREDITO ${parcelas}X` : 'CREDITO';
  return paraCupom(meio.replace(/_/g, ' '));
}

type PagamentoRelatorio = {
  meio: string;
  pedidos: number;
  valor: number;
};

type RelatorioDiaInput = {
  data: string;
  faturamento: number;
  pagamentos: PagamentoRelatorio[];
  /** Dinheiro no caixa em cada abertura da cozinha no dia. */
  aberturasCaixa?: Array<{ valor: number; em: Date }>;
  pedidos: number;
  pedidosGratuitos: number;
  valorGratuito: number;
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
  impressao += alinharLinha('TOTAL DE VENDAS ', ` ${formatarMoeda(input.faturamento)}`, '.') + '\n';
  impressao += alinharLinha('PEDIDOS ', ` ${input.pedidos}`, '.') + '\n';
  impressao += alinharLinha('GRATUITOS ', ` ${input.pedidosGratuitos}`, '.') + '\n';
  impressao +=
    alinharLinha('VALOR GRATUITO ', ` ${formatarMoeda(input.valorGratuito)}`, '.') + '\n';
  if (input.aberturasCaixa?.length) {
    impressao += `${linhaSeparadora('-')}\n`;
    impressao += 'ABERTURA DO CAIXA (TROCO)\n';
    input.aberturasCaixa.forEach((ab) => {
      const hora = ab.em.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      });
      impressao += alinharLinha(`${hora} `, ` ${formatarMoeda(ab.valor)}`, '.') + '\n';
    });
  }
  impressao += `${linhaSeparadora('-')}\n`;
  impressao += 'PAGAMENTOS\n';
  if (input.pagamentos.length === 0) {
    impressao += 'Nenhum no periodo\n';
  }
  input.pagamentos.forEach((pag) => {
    impressao +=
      alinharLinha(`${pag.meio} (${pag.pedidos}) `, ` ${formatarMoeda(pag.valor)}`, '.') + '\n';
  });
  impressao += `${linhaSeparadora('-')}\n`;
  impressao += 'PRODUTOS\n';
  impressao += formatarRanking(input.topProdutos);
  impressao += `${linhaSeparadora('-')}\n`;
  impressao += 'ADICIONAIS\n';
  impressao += formatarRanking(input.topAdicionais);
  impressao += `${linhaSeparadora('=')}\n`;
  impressao += '\n\n\n';

  return impressao;
}

type PedidoRelatorio = {
  nome: string;
  valor: number;
  /** Rótulo pronto, ver `rotuloMeioPagamento`. */
  meio: string;
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
    const esq = `${item.nome} (${item.meio}) `;
    const dir = ` ${formatarMoeda(item.valor)}`;
    texto += alinharLinha(esq, dir, '.') + '\n';
  });
  return texto;
}

export function formatarRelatorioCompleto(input: RelatorioCompletoInput): string {
  let impressao = '';

  impressao += `${linhaSeparadora('=')}\n`;
  impressao += 'FOOD HOPE - RELATORIO COMPLETO\n';
  impressao += `Data: ${formatarDataSp(input.data)}\n`;
  impressao += `Gerado: ${formatarHorarioSp(input.geradoEm)}\n`;
  impressao += `${linhaSeparadora('=')}\n`;
  impressao += 'PEDIDOS\n';
  impressao += formatarListaPedidos(input.pedidos);
  impressao += `${linhaSeparadora('-')}\n`;
  impressao += alinharLinha('TOTAL ', ` ${formatarMoeda(input.faturamento)}`, '.') + '\n';
  impressao += alinharLinha('QTD PEDIDOS ', ` ${input.pedidos.length}`, '.') + '\n';
  impressao += `${linhaSeparadora('=')}\n`;
  impressao += '\n\n\n';

  return impressao;
}

export function formatarCupomTeste(destino: string, geradoEm = new Date()): string {
  return [
    linhaBanner('Teste de impressao'),
    linhaSeparadora(),
    linhaCentralizada('Food Hope'),
    linhaMetaCupom(formatarHorarioSp(geradoEm)),
    linhaSeparadora('-'),
    alinharLinha('DESTINO', ` ${paraCupom(destino)}`),
    alinharLinha('LARGURA', ` ${LARGURA_CUPOM} COLUNAS`),
    linhaSeparadora('-'),
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789',
    linhaItemCupom(1, 'Item de exemplo', 10),
    linhaTotalCupom('Total', 10),
    linhaSeparadora(),
    linhaCentralizada('Se voce leu isto, a impressora esta OK'),
  ].join('\n');
}
