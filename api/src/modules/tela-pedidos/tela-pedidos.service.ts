import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
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
  ) {}

  async obterConfig() {
    try {
      const config = await this.obterOuCriar();
      return {
        hash: config.hash,
        urlPath: `/painel/tela-pedidos/${config.hash}`,
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

      return {
        mensagem: 'Link da tela de pedidos regenerado',
        dados: {
          hash: config.hash,
          urlPath: `/painel/tela-pedidos/${config.hash}`,
        },
      };
    } catch (erro) {
      console.error('Erro ao regenerar hash da tela de pedidos:', erro);
      throw new InternalServerErrorException(
        'Não foi possível regenerar o link da tela de pedidos.',
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
      const pedidos = await this.prismaRead.pedido.findMany({
        where: {
          prontoAt: { not: null },
        },
        take: LISTAR_LIMIT,
        orderBy: [{ prontoAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          numero: true,
          nome_completo: true,
          createdAt: true,
          prontoAt: true,
          pago: true,
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
          pago: Boolean(pedido.pago),
        })),
      };
    } catch (erro) {
      if (erro instanceof NotFoundException) throw erro;
      console.error('Erro ao listar pedidos da tela pública:', erro);
      throw new InternalServerErrorException(
        'Não foi possível carregar os pedidos prontos.',
      );
    }
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
