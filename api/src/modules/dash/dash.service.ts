import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { formatarRelatorioDia } from '../impressora/impressao-texto.js';
import { ImpressoraService } from '../impressora/impressora.service.js';

type ResumoRow = {
  comprasHoje: number | bigint | string;
  faturamentoHoje: number | string;
  leadsTotal: number | bigint | string;
};

type ProdutoRow = {
  produtoId: string;
  nome: string;
  quantidade: number | bigint | string;
};

type AdicionalRow = {
  adicionalId: string;
  nome: string;
  quantidade: number | bigint | string;
};

function toNumber(value: number | bigint | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class DashService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly impressora: ImpressoraService,
    @InjectQueue('fila-impressao') private readonly filaImpressao: Queue,
  ) {}

  async obterResumo() {
    try {
      const [resumoRows, topProdutosRows, topAdicionaisRows] = await Promise.all([
        this.prismaRead.$queryRaw<ResumoRow[]>`
          SELECT
            (
              SELECT COUNT(*)::int
              FROM pedido p
              WHERE (p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
                = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
            ) AS "comprasHoje",
            (
              SELECT COALESCE(
                SUM(
                  pi.quantidade * pi.preco_produto
                  + COALESCE(
                    (
                      SELECT SUM(
                        (elem->>'qtd')::numeric * (elem->>'preco')::numeric
                      )
                      FROM jsonb_array_elements(
                        CASE
                          WHEN pi.adicional_venda IS NULL THEN '[]'::jsonb
                          WHEN jsonb_typeof(pi.adicional_venda::jsonb) = 'array'
                            THEN pi.adicional_venda::jsonb
                          ELSE '[]'::jsonb
                        END
                      ) AS elem
                    ),
                    0
                  )
                ),
                0
              )
              FROM pedido_item pi
              INNER JOIN pedido p ON p.id = pi.pedido_id
              WHERE (p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
                = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
            ) AS "faturamentoHoje",
            (
              SELECT COUNT(*)::int FROM lead
            ) AS "leadsTotal"
        `,
        this.prismaRead.$queryRaw<ProdutoRow[]>`
          SELECT
            pr.id AS "produtoId",
            pr.nome AS nome,
            SUM(pi.quantidade)::int AS quantidade
          FROM pedido_item pi
          INNER JOIN pedido p ON p.id = pi.pedido_id
          INNER JOIN produto pr ON pr.id = pi.produto_id
          WHERE (p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
            = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
          GROUP BY pr.id, pr.nome
          ORDER BY quantidade DESC
          LIMIT 5
        `,
        this.prismaRead.$queryRaw<AdicionalRow[]>`
          SELECT
            elem->>'id' AS "adicionalId",
            elem->>'nome' AS nome,
            SUM((elem->>'qtd')::int)::int AS quantidade
          FROM pedido_item pi
          INNER JOIN pedido p ON p.id = pi.pedido_id
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE
              WHEN pi.adicional_venda IS NULL THEN '[]'::jsonb
              WHEN jsonb_typeof(pi.adicional_venda::jsonb) = 'array'
                THEN pi.adicional_venda::jsonb
              ELSE '[]'::jsonb
            END
          ) AS elem
          WHERE (p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
            = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
            AND COALESCE(elem->>'id', '') <> ''
          GROUP BY elem->>'id', elem->>'nome'
          ORDER BY quantidade DESC
          LIMIT 5
        `,
      ]);

      const resumo = resumoRows[0];
      const topProdutos = topProdutosRows.map((row) => ({
        produtoId: row.produtoId,
        nome: row.nome,
        quantidade: toNumber(row.quantidade),
      }));
      const topAdicionais = topAdicionaisRows.map((row) => ({
        adicionalId: row.adicionalId,
        nome: row.nome,
        quantidade: toNumber(row.quantidade),
      }));

      return {
        dados: {
          faturamentoHoje: toNumber(resumo?.faturamentoHoje),
          comprasHoje: toNumber(resumo?.comprasHoje),
          leadsTotal: toNumber(resumo?.leadsTotal),
          produtoMaisVendido: topProdutos[0] ?? null,
          adicionalMaisVendido: topAdicionais[0] ?? null,
          topProdutos,
          topAdicionais,
        },
      };
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível carregar o resumo do dashboard.',
      );
    }
  }

  async gerarRelatorio() {
    if (!this.impressora.estaConfigurada()) {
      throw new BadRequestException(
        'Impressora não configurada. Configure o IP em Configurações > Impressora.',
      );
    }

    try {
      const { dados } = await this.obterResumo();
      const texto = formatarRelatorioDia({
        faturamentoHoje: dados.faturamentoHoje,
        comprasHoje: dados.comprasHoje,
        topProdutos: dados.topProdutos,
        topAdicionais: dados.topAdicionais,
        geradoEm: new Date(),
      });

      await this.filaImpressao.add('imprimir-relatorio', { texto });

      return {
        mensagem: 'Relatório enviado para a impressora',
        dados: {},
      };
    } catch (erro) {
      if (erro instanceof BadRequestException) throw erro;
      if (erro instanceof InternalServerErrorException) throw erro;
      throw new InternalServerErrorException(
        'Não foi possível gerar o relatório. Tente novamente.',
      );
    }
  }
}
