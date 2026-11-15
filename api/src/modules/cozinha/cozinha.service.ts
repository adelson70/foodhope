import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';
import type { AtualizarCozinhaDto } from './dto/atualizar-cozinha.dto.js';

const CONFIG_ID = 'default';

@Injectable()
export class CozinhaService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly websocket: WebsocketGateway,
  ) {}

  async obter() {
    try {
      const config = await this.obterOuCriar();
      return {
        dados: {
          ativa: config.ativa,
        },
      };
    } catch (erro) {
      console.error('Erro ao obter config da cozinha:', erro);
      throw new InternalServerErrorException(
        'Não foi possível carregar a configuração da cozinha.',
      );
    }
  }

  /**
   * Liga/desliga a cozinha. Ao abrir com `fundo_troco`, registra a abertura do caixa junto,
   * na mesma transação.
   */
  async atualizar(dto: AtualizarCozinhaDto, operadorId?: string) {
    try {
      const { config, abertura } = await this.prismaWrite.$transaction(async (tx) => {
        const config = await tx.configCozinha.upsert({
          where: { id: CONFIG_ID },
          create: { id: CONFIG_ID, ativa: dto.ativa },
          update: { ativa: dto.ativa },
        });
        const abertura =
          dto.ativa && dto.fundo_troco !== undefined
            ? await tx.aberturaCaixa.create({
                data: {
                  fundoTroco: dto.fundo_troco,
                  observacao: dto.observacao?.trim() || null,
                  operadorId: operadorId ?? null,
                },
              })
            : null;
        return { config, abertura };
      });

      this.websocket.emitirCardapio('cozinha:status', { ativa: config.ativa });

      return {
        mensagem: config.ativa
          ? 'Cozinha ativada'
          : 'Cozinha desativada — loja fechada para compras',
        dados: {
          ativa: config.ativa,
          abertura: abertura ? this.formatarAbertura(abertura) : null,
        },
      };
    } catch (erro) {
      console.error('Erro ao atualizar config da cozinha:', erro);
      throw new InternalServerErrorException(
        'Não foi possível atualizar a configuração da cozinha.',
      );
    }
  }

  /** Última abertura de caixa registrada (só para o painel; o GET público não expõe valores). */
  async ultimaAbertura() {
    const abertura = await this.prismaRead.aberturaCaixa.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return { dados: { abertura: abertura ? this.formatarAbertura(abertura) : null } };
  }

  private formatarAbertura(abertura: {
    fundoTroco: { toString(): string };
    observacao: string | null;
    createdAt: Date;
  }) {
    return {
      fundo_troco: Number(abertura.fundoTroco.toString()),
      observacao: abertura.observacao,
      createdAt: abertura.createdAt.toISOString(),
    };
  }

  async assertAberta() {
    const config = await this.obterOuCriar();
    if (!config.ativa) {
      throw new BadRequestException('Loja fechada.');
    }
  }

  private async obterOuCriar() {
    const existente = await this.prismaRead.configCozinha.findUnique({
      where: { id: CONFIG_ID },
    });
    if (existente) return existente;

    try {
      return await this.prismaWrite.configCozinha.create({
        data: { id: CONFIG_ID, ativa: true },
      });
    } catch {
      const recriado = await this.prismaRead.configCozinha.findUnique({
        where: { id: CONFIG_ID },
      });
      if (recriado) return recriado;
      throw new InternalServerErrorException('Não foi possível criar a configuração da cozinha.');
    }
  }
}
