import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';

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

  async atualizar(ativa: boolean) {
    try {
      const config = await this.prismaWrite.configCozinha.upsert({
        where: { id: CONFIG_ID },
        create: { id: CONFIG_ID, ativa },
        update: { ativa },
      });

      this.websocket.emitirCardapio('cozinha:status', { ativa: config.ativa });

      return {
        mensagem: config.ativa
          ? 'Cozinha ativada'
          : 'Cozinha desativada — loja fechada para compras',
        dados: {
          ativa: config.ativa,
        },
      };
    } catch (erro) {
      console.error('Erro ao atualizar config da cozinha:', erro);
      throw new InternalServerErrorException(
        'Não foi possível atualizar a configuração da cozinha.',
      );
    }
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
      throw new InternalServerErrorException(
        'Não foi possível criar a configuração da cozinha.',
      );
    }
  }
}
