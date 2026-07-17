import { ListarDto } from './dto/listar.dto.js';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { PrismaReadService } from '../../infra/database/prisma-read.service.js';

import { ClientePedido, CriarPedidoDto } from './dto/criar.dto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';
import {
  alinharLinha,
  formatarMoeda,
  linhaSeparadora,
} from '../impressora/impressao-texto.js';

@Injectable()
export class PedidoService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    @InjectQueue('fila-impressao') private filaImpressao: Queue,
    private readonly websocket: WebsocketGateway
  ) { }

  async listarPedido(dto: ListarDto) {
    try {
      const limit = dto.limit || 10;
      const cursorStr = dto.cursor;

      let decodedCursor: { id: string; createdAt: string | Date } | null = null;

      if (cursorStr) {
        try {
          const jsonString = Buffer.from(cursorStr, 'base64').toString('utf-8');
          decodedCursor = JSON.parse(jsonString);
        } catch (e) {
          throw new BadRequestException('O cursor fornecido é inválido.');
        }
      }

      const pedidos = await this.prismaRead.pedido.findMany({
        take: limit + 1,
        cursor: decodedCursor ? { id: decodedCursor.id } : undefined,
        skip: decodedCursor ? 1 : 0,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          itens: {
            include: {
              produto: true,
            },
          },
        },
      });

      let nextCursor: string | null = null;
      const hasNextPage = pedidos.length > limit;

      if (hasNextPage) {
        pedidos.pop();

        const lastItem = pedidos[pedidos.length - 1];

        const cursorPayload = JSON.stringify({
          id: lastItem.id,
          createdAt: lastItem.createdAt,
        });

        nextCursor = Buffer.from(cursorPayload).toString('base64');
      }

      const pedidosFormatados = pedidos.map((pedido) => ({
        ...pedido,
        numero: pedido.numero.toString(),
      }));

      return {
        pedidos: pedidosFormatados,
        meta: {
          hasNextPage,
          nextCursor,
        },
      };
    } catch (erro) {
      console.error('Erro ao listar pedidos:', erro);

      if (erro instanceof BadRequestException) {
        throw erro;
      }

      throw new InternalServerErrorException(
        'Não foi possível listar os pedidos. Tente novamente.',
      );
    }
  }

  async buscarPedido(params: string) {
    try {
      if (!params || params.trim().length === 0) {
        return { mensagem: 'Nenhum pedido encontrado', dados: { pedidos: [] } };
      }

      const orConditions: any[] = [
        {
          nome_completo: {
            contains: params,
            mode: 'insensitive',
          },
        },
        {
          itens: {
            some: {
              produto: {
                nome: {
                  contains: params,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        {
          itens: {
            some: {
              produto: {
                descricao: {
                  contains: params,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ];

      try {
        const numeroBuscado = BigInt(params);
        orConditions.push({ numero: numeroBuscado });
      } catch (e) { }

      const pedidos = await this.prismaRead.pedido.findMany({
        where: {
          OR: orConditions,
        },
        include: {
          itens: {
            include: {
              produto: true,
            },
          },
        },
      });

      if (!pedidos || pedidos.length === 0) {
        return { mensagem: 'Nenhum pedido encontrado', dados: { pedidos: [] } };
      }

      const pedidosFormatados = pedidos.map((pedido) => ({
        ...pedido,
        numero: pedido.numero.toString(),
      }));

      return { dados: { pedidos: pedidosFormatados } };

    } catch (erro) {
      console.error('Erro ao buscar pedido:', erro);

      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Pedido não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível listar os pedidos. Tente novamente.',
      );
    }
  }

  async criarPedido(dto: CriarPedidoDto) {
    try {
      const pedidoCompleto = await this.prismaWrite.$transaction(async (tx) => {
        const contato = dto.cliente.contato?.trim() || undefined;
        const sobrenome = dto.cliente.sobrenome?.trim() || undefined;
        const cidade = dto.cliente.cidade?.trim() || undefined;

        if (contato) {
          const leadExistente = await tx.lead.findFirst({
            where: { contato },
          });

          if (leadExistente) {
            await tx.lead.update({
              where: { id: leadExistente.id },
              data: {
                primeiro_nome: dto.cliente.primeiro_nome,
                sobrenome,
                cidade,
              },
            });
          } else {
            await tx.lead.create({
              data: {
                primeiro_nome: dto.cliente.primeiro_nome,
                sobrenome,
                contato,
                cidade,
              },
            });
          }
        }

        const nome_completo = [dto.cliente.primeiro_nome, sobrenome]
          .filter(Boolean)
          .join(' ');

        const itensParaCriar: any[] = [];

        for (const itemDto of dto.itens) {
          const produto = await tx.produto.findUnique({
            where: { id: itemDto.id },
          });

          if (!produto) {
            throw new Error(`Produto com ID ${itemDto.id} não encontrado.`);
          }

          if (!produto.ativo) {
            throw new Error(`Produto com ID ${itemDto.id} indisponível.`);
          }

          const adicionaisVenda: Array<{ id: string; nome: string; preco: number; qtd: number }> =
            [];
          if (itemDto.adicional && itemDto.adicional.length > 0) {
            for (const addDto of itemDto.adicional) {
              const adicionalEspecifico = await tx.adicionalProduto.findFirst({
                where: {
                  id: addDto.id,
                  produto_id: produto.id,
                  ativo: true,
                },
              });

              if (adicionalEspecifico) {
                adicionaisVenda.push({
                  id: adicionalEspecifico.id,
                  nome: adicionalEspecifico.nome,
                  preco: Number(adicionalEspecifico.preco),
                  qtd: addDto.qtd,
                });
                continue;
              }

              const adicionalGlobal = await tx.adicionalGlobal.findFirst({
                where: {
                  id: addDto.id,
                  ativo: true,
                  produtos: {
                    some: { produto_id: produto.id },
                  },
                },
              });

              if (!adicionalGlobal) {
                throw new Error(
                  `Adicional com ID ${addDto.id} indisponível ou não vinculado a este produto.`,
                );
              }

              adicionaisVenda.push({
                id: adicionalGlobal.id,
                nome: adicionalGlobal.nome,
                preco: Number(adicionalGlobal.preco),
                qtd: addDto.qtd,
              });
            }
          }

          itensParaCriar.push({
            produto_id: produto.id,
            quantidade: itemDto.qtd,
            preco_produto: produto.preco,
            adicional_venda: adicionaisVenda,
            observacao: itemDto.observacao,
          });
        }

        const pedidoCriado = await tx.pedido.create({
          data: {
            nome_completo: nome_completo,
            itens: {
              create: itensParaCriar,
            },
          },
          include: {
            itens: { include: { produto: true } },
          },
        });

        return { ...pedidoCriado, numero: pedidoCriado.numero.toString() };
      });

      const textoParaImprimir = this.formatarParaImpressora(pedidoCompleto, dto.cliente);

      await this.filaImpressao.add('imprimir-pedido', {
        texto: textoParaImprimir
      })

      this.websocket.emitirParaOperadores('novo-pedido', pedidoCompleto)

      //this.impressora.print(textoParaImprimir);

      return {
        mensagem: 'Pedido criado com sucesso',
        dados: {
          pedido: pedidoCompleto,
        },
      };
    } catch (erro) {
      console.error('Erro ao criar pedido:', erro);

      if (erro instanceof Error && erro.message.includes('não encontrado')) {
        throw new NotFoundException(erro.message);
      }

      throw new InternalServerErrorException(
        'Não foi possível processar o pedido. Tente novamente.',
      );
    }
  }

  private formatarParaImpressora(pedido: any, cliente: ClientePedido) {
    let impressao = '';

    impressao += `${linhaSeparadora('=')}\n`;
    impressao += `PEDIDO #${pedido.numero}\n`;
    const nomeCliente = [cliente.primeiro_nome, cliente.sobrenome]
      .filter(Boolean)
      .join(' ');
    impressao += `CLIENTE: ${nomeCliente}\n`;
    impressao += `${linhaSeparadora('=')}\n\n`;

    let valorTotalPedido = 0;

    pedido.itens.forEach((item: any) => {
      const subtotalLanche = item.quantidade * Number(item.preco_produto);
      valorTotalPedido += subtotalLanche;

      const nomeProduto = item.produto?.nome || 'Lanche';

      const textoEsqLanche = `${item.quantidade}x ${nomeProduto.toUpperCase()} `;
      const textoDirLanche = ` ${formatarMoeda(subtotalLanche)}`;
      impressao += alinharLinha(textoEsqLanche, textoDirLanche, '.') + '\n';

      if (
        item.adicional_venda &&
        Array.isArray(item.adicional_venda) &&
        item.adicional_venda.length > 0
      ) {
        item.adicional_venda.forEach((add: any) => {
          const subtotalAdicional = add.qtd * Number(add.preco);
          valorTotalPedido += subtotalAdicional;

          const textoEsqAdic = `  + ${add.qtd}x Adic: ${add.nome} `;
          const textoDirAdic = ` ${formatarMoeda(subtotalAdicional)}`;

          impressao += alinharLinha(textoEsqAdic, textoDirAdic, '.') + '\n';
        });
      }

      if (item.observacao && item.observacao.trim() !== '') {
        impressao += `  OBS: ${item.observacao}\n`;
      }

      impressao += '\n';
    });

    impressao += `${linhaSeparadora('-')}\n`;
    impressao +=
      alinharLinha('TOTAL A PAGAR:', formatarMoeda(valorTotalPedido), ' ') +
      '\n';
    impressao += `${linhaSeparadora('=')}\n`;
    impressao += '\n\n\n';

    return impressao;
  }

  async deletarPedido(id: string) {
    try {
      await this.prismaWrite.pedido.delete({ where: { id } })
      return { mensagem: "Pedido deletado com sucesso", dados: {} }
    } catch (erro) {
      console.log('erro', erro)
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Pedido não encontrado.');
      }

      throw new InternalServerErrorException('Não foi possível deletar o pedido. Tente novamente.');
    }
  }
}
