import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import {
  formatarRelatorioCompleto,
  formatarRelatorioDia,
} from '../impressora/impressao-texto.js';
import { ImpressoraService } from '../impressora/impressora.service.js';
import type { TipoRelatorioDto } from './dto/relatorio.dto.js';

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

type PedidoValorRow = {
  nome: string;
  valor: number | string;
};

type DiaResumoRow = {
  pedidos: number | bigint | string;
  faturamento: number | string;
};

function toNumber(value: number | bigint | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dataHojeSp(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  });
}

function resolverDataRelatorio(data?: string): string {
  const escolhida = data?.trim() || dataHojeSp();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(escolhida)) {
    throw new BadRequestException('A data deve estar no formato YYYY-MM-DD');
  }
  const [ano, mes, dia] = escolhida.split('-').map(Number);
  const utc = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    utc.getUTCFullYear() !== ano ||
    utc.getUTCMonth() !== mes - 1 ||
    utc.getUTCDate() !== dia
  ) {
    throw new BadRequestException('Data inválida');
  }
  return escolhida;
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

  private async obterResumidoPorData(data: string) {
    const [resumoRows, topProdutosRows, topAdicionaisRows] = await Promise.all([
      this.prismaRead.$queryRaw<DiaResumoRow[]>`
        SELECT
          (
            SELECT COUNT(*)::int
            FROM pedido p
            WHERE (p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
              = CAST(${data} AS DATE)
          ) AS pedidos,
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
              = CAST(${data} AS DATE)
          ) AS faturamento
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
          = CAST(${data} AS DATE)
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
          = CAST(${data} AS DATE)
          AND COALESCE(elem->>'id', '') <> ''
        GROUP BY elem->>'id', elem->>'nome'
        ORDER BY quantidade DESC
        LIMIT 5
      `,
    ]);

    const resumo = resumoRows[0];

    return {
      faturamento: toNumber(resumo?.faturamento),
      pedidos: toNumber(resumo?.pedidos),
      topProdutos: topProdutosRows.map((row) => ({
        nome: row.nome,
        quantidade: toNumber(row.quantidade),
      })),
      topAdicionais: topAdicionaisRows.map((row) => ({
        nome: row.nome,
        quantidade: toNumber(row.quantidade),
      })),
    };
  }

  private async obterCompletoPorData(data: string) {
    const pedidosRows = await this.prismaRead.$queryRaw<PedidoValorRow[]>`
      SELECT
        p.nome_completo AS nome,
        COALESCE(
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
        ) AS valor
      FROM pedido p
      LEFT JOIN pedido_item pi ON pi.pedido_id = p.id
      WHERE (p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
        = CAST(${data} AS DATE)
      GROUP BY p.id, p.nome_completo, p."createdAt"
      ORDER BY lower(p.nome_completo) ASC, p."createdAt" ASC
    `;

    const pedidos = pedidosRows.map((row) => ({
      nome: row.nome,
      valor: toNumber(row.valor),
    }));

    const faturamento = pedidos.reduce((acc, item) => acc + item.valor, 0);

    return { pedidos, faturamento };
  }

  async gerarRelatorio(
    tipo: TipoRelatorioDto = 'resumido',
    data?: string,
  ) {
    if (!this.impressora.estaConfigurada()) {
      throw new BadRequestException(
        'Impressora não configurada. Configure o IP em Configurações > Impressora.',
      );
    }

    try {
      const dataRelatorio = resolverDataRelatorio(data);
      const geradoEm = new Date();
      let texto: string;

      if (tipo === 'completo') {
        const detalhado = await this.obterCompletoPorData(dataRelatorio);
        texto = formatarRelatorioCompleto({
          data: dataRelatorio,
          faturamento: detalhado.faturamento,
          pedidos: detalhado.pedidos,
          geradoEm,
        });
      } else {
        const resumido = await this.obterResumidoPorData(dataRelatorio);
        texto = formatarRelatorioDia({
          data: dataRelatorio,
          faturamento: resumido.faturamento,
          pedidos: resumido.pedidos,
          topProdutos: resumido.topProdutos,
          topAdicionais: resumido.topAdicionais,
          geradoEm,
        });
      }

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
