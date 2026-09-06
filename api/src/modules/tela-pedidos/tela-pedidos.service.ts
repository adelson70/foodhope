import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';
import type { VisualizacaoTelaPedidos } from '../../../generated/prisma/enums.js';
import {
  gerarHashTelaPedidos,
  hashesTelaPedidosIguais,
} from './tela-pedidos-hash.js';

const CONFIG_ID = 'default';
const LISTAR_LIMIT = 24;

@Injectable()
export class TelaPedidosService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly websocket: WebsocketGateway,
  ) {}

  async obterConfig() {
    try {
      const config = await this.obterOuCriar();
      return {
        hash: config.hash,
        urlPath: `/painel/tela-pedidos/${config.hash}`,
        visualizacao: config.visualizacao,
      };
    } catch (erro) {
      console.error('Erro ao obter config da tela de pedidos:', erro);
      throw new InternalServerErrorException(
        'Não foi possível carregar a configuração da tela de pedidos.',
      );
    }
  }

  async regenerarHash() {
    try {
      const hash = gerarHashTelaPedidos();
      const config = await this.prismaWrite.configTelaPedidos.upsert({
        where: { id: CONFIG_ID },
        create: { id: CONFIG_ID, hash },
        update: { hash },
      });

      this.websocket.emitirParaMonitores('tela-pedidos:refresh', {});

      return {
        mensagem: 'Link da tela de pedidos regenerado',
        dados: {
          hash: config.hash,
          urlPath: `/painel/tela-pedidos/${config.hash}`,
          visualizacao: config.visualizacao,
        },
      };
    } catch (erro) {
      console.error('Erro ao regenerar hash da tela de pedidos:', erro);
      throw new InternalServerErrorException(
        'Não foi possível regenerar o link da tela de pedidos.',
      );
    }
  }

  async atualizarVisualizacao(visualizacao: VisualizacaoTelaPedidos) {
    try {
      const config = await this.prismaWrite.configTelaPedidos.upsert({
        where: { id: CONFIG_ID },
        create: {
          id: CONFIG_ID,
          hash: gerarHashTelaPedidos(),
          visualizacao,
        },
        update: { visualizacao },
      });

      this.websocket.emitirParaMonitores('tela-pedidos:refresh', {});

      return {
        mensagem: 'Visualização da tela de pedidos atualizada',
        dados: {
          hash: config.hash,
          urlPath: `/painel/tela-pedidos/${config.hash}`,
          visualizacao: config.visualizacao,
        },
      };
    } catch (erro) {
      console.error('Erro ao atualizar visualização da tela de pedidos:', erro);
      throw new InternalServerErrorException(
        'Não foi possível atualizar a visualização da tela de pedidos.',
      );
    }
  }

  async forcarRefresh() {
    try {
      await this.obterOuCriar();
      this.websocket.emitirParaMonitores('tela-pedidos:refresh', {});

      return {
        mensagem: 'Atualização forçada na tela de pedidos',
        dados: { ok: true },
      };
    } catch (erro) {
      console.error('Erro ao forçar refresh da tela de pedidos:', erro);
      throw new InternalServerErrorException(
        'Não foi possível atualizar a tela de pedidos.',
      );
    }
  }

  async hashValido(hash: string): Promise<boolean> {
    if (!hash || typeof hash !== 'string') return false;
    const config = await this.prismaRead.configTelaPedidos.findUnique({
      where: { id: CONFIG_ID },
    });
    if (!config?.hash) return false;
    return hashesTelaPedidosIguais(config.hash, hash.trim());
  }

  async listarPorHash(hash: string) {
    const valido = await this.hashValido(hash);
    if (!valido) {
      throw new NotFoundException('Tela de pedidos não encontrada.');
    }

    try {
      const config = await this.obterOuCriar();
      const where: {
        prontoAt: { not: null } | { gte: Date; lt: Date };
      } = {
        prontoAt: { not: null },
      };

      if (config.visualizacao === 'DIA') {
        where.prontoAt = this.intervaloDiaSp(this.hojeSpIso());
      }

      const pedidos = await this.prismaRead.pedido.findMany({
        where,
        take: LISTAR_LIMIT,
        orderBy: [{ prontoAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          numero: true,
          nome_completo: true,
          createdAt: true,
          prontoAt: true,
          status_pagamento: true,
        },
      });

      return {
        pedidos: pedidos.map((pedido) => ({
          id: pedido.id,
          numero: pedido.numero.toString(),
          nome_completo: pedido.nome_completo,
          createdAt:
            pedido.createdAt instanceof Date
              ? pedido.createdAt.toISOString()
              : pedido.createdAt,
          prontoAt: pedido.prontoAt ? pedido.prontoAt.toISOString() : null,
          pronto: Boolean(pedido.prontoAt),
          status_pagamento: pedido.status_pagamento,
        })),
        visualizacao: config.visualizacao,
      };
    } catch (erro) {
      if (erro instanceof NotFoundException) throw erro;
      console.error('Erro ao listar pedidos da tela pública:', erro);
      throw new InternalServerErrorException(
        'Não foi possível carregar os pedidos prontos.',
      );
    }
  }

  private hojeSpIso(): string {
    return new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
    });
  }

  private intervaloDiaSp(data: string): { gte: Date; lt: Date } {
    const inicio = new Date(`${data}T00:00:00-03:00`);

    if (Number.isNaN(inicio.getTime())) {
      throw new BadRequestException('A data fornecida é inválida.');
    }

    const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
    return { gte: inicio, lt: fim };
  }

  private async obterOuCriar() {
    const existente = await this.prismaRead.configTelaPedidos.findUnique({
      where: { id: CONFIG_ID },
    });
    if (existente) return existente;

    try {
      return await this.prismaWrite.configTelaPedidos.create({
        data: {
          id: CONFIG_ID,
          hash: gerarHashTelaPedidos(),
        },
      });
    } catch {
      const recriado = await this.prismaRead.configTelaPedidos.findUnique({
        where: { id: CONFIG_ID },
      });
      if (recriado) return recriado;
      throw new InternalServerErrorException(
        'Não foi possível criar a configuração da tela de pedidos.',
      );
    }
  }
}
