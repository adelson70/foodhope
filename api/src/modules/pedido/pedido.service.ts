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
  formatarHorarioCupom,
  linhaAdicionalCupom,
  linhaBanner,
  linhaCentralizada,
  linhaItemCupom,
  linhaMetaCupom,
  linhaNumeroPedido,
  linhaObsCupom,
  linhaSeparadora,
  linhaTotalCupom,
  montarTextoObservacaoCupom,
  paraCupom,
} from '../impressora/impressao-texto.js';
import type { AuthUser } from '../../infra/auth/auth.guard.js';
import { CozinhaService } from '../cozinha/cozinha.service.js';

@Injectable()
export class PedidoService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    @InjectQueue('fila-impressao') private filaImpressao: Queue,
    private readonly websocket: WebsocketGateway,
    private readonly cozinha: CozinhaService,
  ) {}

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

      const where: Prisma.PedidoWhereInput = {};

      if (dto.data) {
        where.createdAt = this.intervaloDiaSp(dto.data);
      }

      if (dto.pronto === true) {
        where.prontoAt = { not: null };
      } else if (dto.pronto === false) {
        where.prontoAt = null;
      }

      const orderBy: Prisma.PedidoOrderByWithRelationInput[] =
        dto.pronto === true
          ? [{ prontoAt: 'desc' }, { id: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }];

      const pedidos = await this.prismaRead.pedido.findMany({
        where,
        take: limit + 1,
        cursor: decodedCursor ? { id: decodedCursor.id } : undefined,
        skip: decodedCursor ? 1 : 0,
        orderBy,
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

      const pedidosFormatados = pedidos.map((pedido) =>
        this.formatarPedido(pedido),
      );

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
      } catch (e) {}

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

      const pedidosFormatados = pedidos.map((pedido) =>
        this.formatarPedido(pedido),
      );

      return { dados: { pedidos: pedidosFormatados } };
    } catch (erro) {
      console.error('Erro ao buscar pedido:', erro);

      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2025'
      ) {
        throw new NotFoundException('Pedido não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível listar os pedidos. Tente novamente.',
      );
    }
  }

  async criarPedido(dto: CriarPedidoDto, user: AuthUser) {
    if (user.tipo === 'visitor') {
      throw new BadRequestException(
        'Para fazer o pedido, finalize o pagamento pelo checkout.',
      );
    }

    let status_pagamento: 'PAGO' | 'NAO_PAGO' | 'GRATUITO';

    if (user.role === 'TOTEM') {
      await this.cozinha.assertAberta();
      status_pagamento = 'NAO_PAGO';
    } else if (user.role === 'ADMIN' || user.role === 'OPERADOR') {
      if (
        dto.status_pagamento !== 'PAGO' &&
        dto.status_pagamento !== 'NAO_PAGO' &&
        dto.status_pagamento !== 'GRATUITO'
      ) {
        throw new BadRequestException(
          'Informe o status de pagamento do pedido.',
        );
      }
      status_pagamento = dto.status_pagamento;
    } else {
      throw new BadRequestException('Operação não autorizada');
    }

    return this.criarPedidoPago(dto, status_pagamento);
  }

  async criarPedidoPago(
    dto: CriarPedidoDto,
    status_pagamento: 'PAGO' | 'NAO_PAGO' | 'GRATUITO',
  ) {
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

          const adicionaisVenda: Array<{
            id: string;
            nome: string;
            preco: number;
            qtd: number;
          }> = [];
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

          const retiradasVenda: Array<{ id: string; nome: string }> = [];
          if (itemDto.retirar && itemDto.retirar.length > 0) {
            const idsUnicos = [...new Set(itemDto.retirar)];
            const ingredientes = await tx.ingredienteProduto.findMany({
              where: {
                id: { in: idsUnicos },
                produto_id: produto.id,
              },
              select: { id: true, nome: true },
            });

            if (ingredientes.length !== idsUnicos.length) {
              throw new Error(
                'Um ou mais ingredientes para retirar estão indisponíveis neste produto.',
              );
            }

            for (const id of idsUnicos) {
              const ingrediente = ingredientes.find((item) => item.id === id);
              if (!ingrediente) continue;
              retiradasVenda.push({
                id: ingrediente.id,
                nome: ingrediente.nome,
              });
            }
          }

          itensParaCriar.push({
            produto_id: produto.id,
            quantidade: itemDto.qtd,
            preco_produto: produto.preco,
            adicional_venda: adicionaisVenda,
            retirada_venda: retiradasVenda,
            observacao: itemDto.observacao,
          });
        }

        const pedidoCriado = await tx.pedido.create({
          data: {
            nome_completo: nome_completo,
            tipo_consumo: dto.tipo_consumo ?? 'COMER_AQUI',
            status_pagamento,
            itens: {
              create: itensParaCriar,
            },
          },
          include: {
            itens: { include: { produto: true } },
          },
        });

        return this.formatarPedido(pedidoCriado);
      });

      await this.enfileirarImpressao(pedidoCompleto, dto.cliente);

      this.websocket.emitirParaOperadores('novo-pedido', pedidoCompleto);

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

      if (erro instanceof Error && erro.message.includes('indisponível')) {
        throw new BadRequestException(erro.message);
      }

      throw new InternalServerErrorException(
        'Não foi possível processar o pedido. Tente novamente.',
      );
    }
  }

  async marcarPedidoPronto(id: string) {
    try {
      const pedido = await this.prismaRead.pedido.findUnique({
        where: { id },
        include: {
          itens: { include: { produto: true } },
        },
      });

      if (!pedido) {
        throw new NotFoundException('Pedido não encontrado.');
      }

      if (pedido.prontoAt) {
        return {
          mensagem: 'Pedido já estava pronto',
          dados: {
            pedido: this.formatarPedido(pedido),
          },
        };
      }

      const atualizado = await this.prismaWrite.pedido.update({
        where: { id },
        data: { prontoAt: new Date() },
        include: {
          itens: { include: { produto: true } },
        },
      });

      const pedidoCompleto = this.formatarPedido(atualizado);

      this.websocket.emitirParaOperadores('pedido:pronto', pedidoCompleto);
      this.websocket.emitirParaClientes('pedido:pronto', {
        id: pedidoCompleto.id,
        numero: pedidoCompleto.numero,
        pronto: true,
        prontoAt: pedidoCompleto.prontoAt,
      });
      this.websocket.emitirParaMonitores('pedido:saiu', pedidoCompleto);

      return {
        mensagem: 'Pedido marcado como pronto',
        dados: { pedido: pedidoCompleto },
      };
    } catch (erro) {
      if (erro instanceof NotFoundException) {
        throw erro;
      }

      console.error('Erro ao marcar pedido como pronto:', erro);
      throw new InternalServerErrorException(
        'Não foi possível marcar o pedido como pronto. Tente novamente.',
      );
    }
  }

  async marcarPedidoPago(id: string) {
    try {
      const pedido = await this.prismaRead.pedido.findUnique({
        where: { id },
        include: {
          itens: { include: { produto: true } },
        },
      });

      if (!pedido) {
        throw new NotFoundException('Pedido não encontrado.');
      }

      if (pedido.status_pagamento === 'PAGO') {
        return {
          mensagem: 'Pedido já estava pago',
          dados: {
            pedido: this.formatarPedido(pedido),
          },
        };
      }

      if (pedido.status_pagamento === 'GRATUITO') {
        throw new BadRequestException(
          'Pedido gratuito não pode ser marcado como pago.',
        );
      }

      const atualizado = await this.prismaWrite.pedido.update({
        where: { id },
        data: { status_pagamento: 'PAGO' },
        include: {
          itens: { include: { produto: true } },
        },
      });

      const pedidoCompleto = this.formatarPedido(atualizado);
      this.websocket.emitirParaOperadores('pedido:pago', pedidoCompleto);

      return {
        mensagem: 'Pedido marcado como pago',
        dados: { pedido: pedidoCompleto },
      };
    } catch (erro) {
      if (
        erro instanceof NotFoundException ||
        erro instanceof BadRequestException
      ) {
        throw erro;
      }

      console.error('Erro ao marcar pedido como pago:', erro);
      throw new InternalServerErrorException(
        'Não foi possível marcar o pedido como pago. Tente novamente.',
      );
    }
  }

  private formatarPedido<
    T extends {
      numero: bigint;
      prontoAt: Date | null;
      status_pagamento: string;
    },
  >(pedido: T) {
    return {
      ...pedido,
      numero: pedido.numero.toString(),
      prontoAt: pedido.prontoAt ? pedido.prontoAt.toISOString() : null,
      pronto: Boolean(pedido.prontoAt),
      status_pagamento: pedido.status_pagamento,
    };
  }

  private intervaloDiaSp(data: string): { gte: Date; lt: Date } {
    const inicio = new Date(`${data}T00:00:00-03:00`);

    if (Number.isNaN(inicio.getTime())) {
      throw new BadRequestException('A data fornecida é inválida.');
    }

    const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
    return { gte: inicio, lt: fim };
  }

  private rotuloConsumo(tipo?: string) {
    return tipo === 'LEVAR' ? 'LEVAR' : 'COMER AQUI';
  }

  private rotuloStatusPagamento(status?: string) {
    if (status === 'NAO_PAGO') return 'NAO PAGO';
    if (status === 'GRATUITO') return 'GRATUITO';
    return 'PAGO';
  }

  private rotuloStatusCupom(pedido: any) {
    return `${this.rotuloConsumo(pedido.tipo_consumo)} - ${this.rotuloStatusPagamento(pedido.status_pagamento)}`;
  }

  private temObservacao(item: {
    observacao?: string | null;
    retirada_venda?: unknown;
  }) {
    return Boolean(montarTextoObservacaoCupom(item));
  }

  private chaveAdicionaisImpressao(adicional_venda: unknown): string {
    if (!Array.isArray(adicional_venda) || adicional_venda.length === 0) {
      return '';
    }
    return [...adicional_venda]
      .map(
        (add: { id?: string; nome?: string; qtd?: number; preco?: number }) =>
          `${add.id ?? add.nome ?? ''}:${Number(add.qtd)}:${Number(add.preco)}`,
      )
      .sort()
      .join(',');
  }

  private chaveRetiradaImpressao(retirada_venda: unknown): string {
    if (!Array.isArray(retirada_venda) || retirada_venda.length === 0) {
      return '';
    }
    return [...retirada_venda]
      .map((item: { id?: string; nome?: string }) => item.id ?? item.nome ?? '')
      .filter((valor) => valor.length > 0)
      .sort()
      .join(',');
  }

  private chaveGrupoImpressao(item: any): string {
    const produtoId =
      item.produto_id ?? item.produto?.id ?? item.produto?.nome ?? '';
    const obs = (item.observacao ?? '').trim().toLowerCase();
    return `${produtoId}|${this.chaveAdicionaisImpressao(item.adicional_venda)}|${this.chaveRetiradaImpressao(item.retirada_venda)}|${obs}`;
  }

  private consolidarItensImpressao(itens: any[]): any[] {
    const grupos = new Map<string, any>();

    for (const item of itens) {
      const chave = this.chaveGrupoImpressao(item);
      const existente = grupos.get(chave);

      if (!existente) {
        grupos.set(chave, {
          ...item,
          adicional_venda: Array.isArray(item.adicional_venda)
            ? item.adicional_venda.map((add: object) => ({ ...add }))
            : item.adicional_venda,
          retirada_venda: Array.isArray(item.retirada_venda)
            ? item.retirada_venda.map((ret: object) => ({ ...ret }))
            : item.retirada_venda,
        });
        continue;
      }

      existente.quantidade += item.quantidade;

      if (
        !Array.isArray(item.adicional_venda) ||
        !Array.isArray(existente.adicional_venda)
      ) {
        continue;
      }

      for (const add of item.adicional_venda) {
        const chaveAdd = add.id ?? add.nome;
        const encontrado = existente.adicional_venda.find(
          (atual: { id?: string; nome?: string }) =>
            (atual.id ?? atual.nome) === chaveAdd,
        );
        if (encontrado) {
          encontrado.qtd = Number(encontrado.qtd) + Number(add.qtd);
        } else {
          existente.adicional_venda.push({ ...add });
        }
      }
    }

    return [...grupos.values()];
  }

  private async enfileirarImpressao(pedidoCompleto: any, cliente: ClientePedido) {
    const itens = Array.isArray(pedidoCompleto.itens)
      ? pedidoCompleto.itens
      : [];
    const soIgnoraveis =
      itens.length > 0 &&
      itens.every(
        (item: { produto?: { ignorarImpressaoSozinho?: boolean } }) =>
          Boolean(item.produto?.ignorarImpressaoSozinho),
      );

    if (soIgnoraveis) {
      return;
    }

    const acompanhamentos = itens.filter(
      (item: { produto?: { ignorarImpressaoSozinho?: boolean } }) =>
        Boolean(item.produto?.ignorarImpressaoSozinho),
    );
    const demais = itens.filter(
      (item: { produto?: { ignorarImpressaoSozinho?: boolean } }) =>
        !item.produto?.ignorarImpressaoSozinho,
    );

    const itensSeparadoFlag = demais.filter(
      (item: { produto?: { imprimirSeparado?: boolean } }) =>
        Boolean(item.produto?.imprimirSeparado),
    );
    const itensNormais = demais.filter(
      (item: { produto?: { imprimirSeparado?: boolean } }) =>
        !item.produto?.imprimirSeparado,
    );
    const itensNormaisComObs = itensNormais.filter((item) =>
      this.temObservacao(item),
    );
    const itensNormaisSemObs = itensNormais.filter(
      (item) => !this.temObservacao(item),
    );
    const separarPorObservacao =
      this.consolidarItensImpressao(itensNormaisComObs).length > 1;

    const itensPrincipais = separarPorObservacao
      ? itensNormaisSemObs
      : itensNormais;
    const itensParaSeparar = separarPorObservacao
      ? [...itensSeparadoFlag, ...itensNormaisComObs]
      : itensSeparadoFlag;
    const resumoImprimirSeparado =
      this.consolidarItensImpressao(itensSeparadoFlag);
    const gruposSeparados = this.consolidarItensImpressao(itensParaSeparar);
    const totalCuponsSeparados = gruposSeparados.length;
    const temPrincipal = itensPrincipais.length > 0;

    if (temPrincipal) {
      const textoPrincipal = this.formatarCupom(
        pedidoCompleto,
        [...itensPrincipais, ...resumoImprimirSeparado, ...acompanhamentos],
        cliente,
      );
      await this.filaImpressao.add('imprimir-pedido', {
        texto: textoPrincipal,
      });
    }

    for (let indice = 0; indice < gruposSeparados.length; indice += 1) {
      const ehPrimeiroSemPrincipal = !temPrincipal && indice === 0;
      const grupoAtual = gruposSeparados[indice];
      const extrasPrimeiro = ehPrimeiroSemPrincipal
        ? [
            ...resumoImprimirSeparado.filter(
              (item) =>
                this.chaveGrupoImpressao(item) !==
                this.chaveGrupoImpressao(grupoAtual),
            ),
            ...acompanhamentos,
          ]
        : [];
      const itensCupom = ehPrimeiroSemPrincipal
        ? [grupoAtual, ...extrasPrimeiro]
        : [grupoAtual];
      const textoSeparado = this.formatarCupom(
        pedidoCompleto,
        itensCupom,
        cliente,
        {
          banner: 'A PARTE',
          metaExtra:
            totalCuponsSeparados > 1
              ? `CUPOM ${indice + 1} DE ${totalCuponsSeparados}`
              : undefined,
        },
      );
      await this.filaImpressao.add('imprimir-pedido', {
        texto: textoSeparado,
      });
    }
  }

  private cabecalhoCupom(
    pedido: any,
    cliente: ClientePedido,
    opcoes?: { banner?: string; metaExtra?: string },
  ) {
    const nomeCliente = paraCupom(
      [cliente.primeiro_nome, cliente.sobrenome].filter(Boolean).join(' '),
    );
    const status = this.rotuloStatusCupom(pedido);
    const horario = pedido.createdAt
      ? formatarHorarioCupom(pedido.createdAt)
      : '';

    let impressao = '\n\n\n\n\n';
    if (opcoes?.banner) {
      impressao += `${linhaBanner(opcoes.banner)}\n`;
    }
    impressao += `${linhaNumeroPedido(pedido.numero)}\n`;
    if (opcoes?.metaExtra) {
      impressao += `${linhaMetaCupom(opcoes.metaExtra)}\n`;
    }
    impressao += `${linhaCentralizada(status)}\n`;
    if (nomeCliente) {
      impressao += `${linhaCentralizada(nomeCliente)}\n`;
    }
    if (horario) {
      impressao += `${linhaMetaCupom(horario)}\n`;
    }
    impressao += `${linhaSeparadora('=')}\n`;
    return impressao;
  }

  private formatarBlocoItem(item: any): { texto: string; total: number } {
    let total = 0;
    let texto = '';

    const subtotalLanche = item.quantidade * Number(item.preco_produto);
    total += subtotalLanche;

    const nomeProduto = item.produto?.nome || 'Lanche';
    texto += `${linhaItemCupom(item.quantidade, nomeProduto, subtotalLanche)}\n`;

    if (
      item.adicional_venda &&
      Array.isArray(item.adicional_venda) &&
      item.adicional_venda.length > 0
    ) {
      item.adicional_venda.forEach((add: any) => {
        const subtotalAdicional = add.qtd * Number(add.preco);
        total += subtotalAdicional;
        texto += `${linhaAdicionalCupom(add.nome, subtotalAdicional, add.qtd)}\n`;
      });
    }

    const observacaoCupom = montarTextoObservacaoCupom(item);
    if (observacaoCupom) {
      texto += `${linhaObsCupom(observacaoCupom)}\n`;
    }

    return { texto, total };
  }

  private formatarCupom(
    pedido: any,
    itens: any[],
    cliente: ClientePedido,
    opcoes?: { banner?: string; metaExtra?: string },
  ) {
    let impressao = this.cabecalhoCupom(pedido, cliente, opcoes);
    let valorTotalPedido = 0;

    itens.forEach((item: any, index: number) => {
      if (index > 0) {
        impressao += '\n';
      }
      const bloco = this.formatarBlocoItem(item);
      impressao += bloco.texto;
      valorTotalPedido += bloco.total;
    });

    impressao += `${linhaSeparadora('-')}\n`;
    impressao += `${linhaTotalCupom('TOTAL', valorTotalPedido)}\n`;
    impressao += `${linhaSeparadora('=')}\n`;
    impressao += '\n\n\n';

    return impressao;
  }

  async reimprimirPedido(id: string) {
    try {
      const pedido = await this.prismaRead.pedido.findUnique({
        where: { id },
        include: {
          itens: { include: { produto: true } },
        },
      });

      if (!pedido) {
        throw new NotFoundException('Pedido não encontrado.');
      }

      const pedidoFormatado = this.formatarPedido(pedido);

      const cliente = {
        primeiro_nome: pedido.nome_completo,
      } as ClientePedido;

      await this.enfileirarImpressao(pedidoFormatado, cliente);

      return { mensagem: 'Pedido enviado para impressão', dados: {} };
    } catch (erro) {
      if (erro instanceof NotFoundException) {
        throw erro;
      }

      console.error('Erro ao reimprimir pedido:', erro);
      throw new InternalServerErrorException(
        'Não foi possível reimprimir o pedido. Tente novamente.',
      );
    }
  }

  async deletarPedido(id: string) {
    try {
      await this.prismaWrite.pedido.delete({ where: { id } });
      this.websocket.emitirParaOperadores('pedido:deletado', { id });
      this.websocket.emitirParaMonitores('pedido:deletado', { id });
      return { mensagem: 'Pedido deletado com sucesso', dados: {} };
    } catch (erro) {
      console.log('erro', erro);
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2025'
      ) {
        throw new NotFoundException('Pedido não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível deletar o pedido. Tente novamente.',
      );
    }
  }
}
