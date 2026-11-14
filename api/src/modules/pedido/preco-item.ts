import { BadRequestException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client.js';

type ProdutoParaPreco = {
  id: string;
  nome: string;
  preco: Prisma.Decimal | number;
  tipo: 'SIMPLES' | 'VARIAVEL';
};

type ClienteVariacao = Pick<Prisma.TransactionClient, 'variacaoProduto'>;

export type PrecoItemResolvido = {
  preco: Prisma.Decimal | number;
  variacao_id: string | null;
  variacao_nome: string | null;
};

/**
 * Preço unitário do item conforme o tipo do produto:
 * SIMPLES usa o preço do produto e não aceita variação;
 * VARIAVEL exige uma variação ativa do próprio produto e usa o preço dela.
 */
export async function resolverPrecoItem(
  db: ClienteVariacao,
  produto: ProdutoParaPreco,
  variacaoId: string | undefined | null,
): Promise<PrecoItemResolvido> {
  if (produto.tipo !== 'VARIAVEL') {
    if (variacaoId) {
      throw new BadRequestException(`O produto "${produto.nome}" não possui variações.`);
    }
    return { preco: produto.preco, variacao_id: null, variacao_nome: null };
  }

  if (!variacaoId) {
    throw new BadRequestException(`Escolha a variação de "${produto.nome}".`);
  }

  const variacao = await db.variacaoProduto.findFirst({
    where: { id: variacaoId, produto_id: produto.id, ativo: true },
    select: { id: true, nome: true, preco: true },
  });

  if (!variacao) {
    throw new BadRequestException(
      `A variação escolhida de "${produto.nome}" está indisponível. Escolha outra.`,
    );
  }

  return { preco: variacao.preco, variacao_id: variacao.id, variacao_nome: variacao.nome };
}

export function nomeItemComVariacao(nomeProduto: string, variacaoNome?: string | null) {
  return variacaoNome ? `${nomeProduto} - ${variacaoNome}` : nomeProduto;
}
