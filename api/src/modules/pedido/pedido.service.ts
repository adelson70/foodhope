import { ListarDto } from './dto/listar.dto.js';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { PrismaReadService } from '../../infra/database/prisma-read.service.js';

import { JwtServiceCustom } from '../../infra/auth/jwt.service.js';
import { CriarPedidoDto, ItemPedidoDto } from './dto/criar.dto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { ImpressoraService } from '../impressora/impressora.service.js';

@Injectable()
export class PedidoService {
    constructor(
        private readonly prismaWrite: PrismaWriteService,
        private readonly prismaRead: PrismaReadService,
        private readonly impressora: ImpressoraService,

        private readonly jwt: JwtServiceCustom,
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

            const produtos = await this.prismaRead.produto.findMany({
                take: limit + 1,

                cursor: decodedCursor ? { id: decodedCursor.id } : undefined,

                skip: decodedCursor ? 1 : 0,

                orderBy: [
                    { createdAt: 'desc' },
                    { id: 'desc' },
                ],
            });

            let nextCursor: string | null = null;
            const hasNextPage = produtos.length > limit;

            if (hasNextPage) {
                produtos.pop();

                const lastItem = produtos[produtos.length - 1];

                const cursorPayload = JSON.stringify({
                    id: lastItem.id,
                    createdAt: lastItem.createdAt,
                });

                nextCursor = Buffer.from(cursorPayload).toString('base64');
            }

            return {
                data: produtos,
                meta: {
                    hasNextPage,
                    nextCursor,
                },
            };

        } catch (erro) {
            console.log('erro', erro);

            if (erro instanceof BadRequestException) {
                throw erro;
            }

            throw new InternalServerErrorException('Não foi possível listar os produtos. Tente novamente.');
        }
    }

    async buscarPedido(params: string) {
        try {
            if (params.length === 0) { return { mensagem: 'Nenhum produto encontrado', dados: { produtos: [] } } }

            const produtos = await this.prismaRead.produto.findMany({
                where: {
                    OR: [
                        {
                            nome: {
                                contains: params,
                                mode: 'insensitive'
                            }
                        },
                        {
                            descricao: {
                                contains: params,
                                mode: 'insensitive'
                            }
                        }
                    ]
                }
            })

            if (!produtos || produtos.length === 0) { return { mensagem: 'Nenhum produto encontrado', dados: { produtos: [] } } }

            return { dados: { produtos } }

        } catch (erro) {
            console.log('erro', erro);


            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
                throw new NotFoundException('Produto não encontrado.');
            }

            throw new InternalServerErrorException('Não foi possível listar os produtos. Tente novamente.');
        }
    }

    async criarPedido(dto: CriarPedidoDto) {
        try {
            const pedidoCompleto = await this.prismaWrite.$transaction(async (tx) => {

                let lead = await tx.lead.findFirst({
                    where: { contato: dto.cliente.contato }
                });

                if (lead) {
                    lead = await tx.lead.update({
                        where: { id: lead.id },
                        data: {
                            primeiro_nome: dto.cliente.primeiro_nome,
                            sobrenome: dto.cliente.sobrenome,
                        }
                    });
                } else {
                    lead = await tx.lead.create({
                        data: {
                            primeiro_nome: dto.cliente.primeiro_nome,
                            sobrenome: dto.cliente.sobrenome,
                            contato: dto.cliente.contato,
                        }
                    });
                }

                const nome_completo = `${dto.cliente.primeiro_nome} ${dto.cliente.sobrenome}`;

                const itensParaCriar: any[] = [];

                for (const itemDto of dto.itens) {
                    const produto = await tx.produto.findUnique({
                        where: { id: itemDto.id }
                    });

                    if (!produto) {
                        throw new Error(`Produto com ID ${itemDto.id} não encontrado.`);
                    }

                    const adicionaisVenda: Array<{ id: string; nome: string; preco: number; qtd: number }> = [];
                    if (itemDto.adicional && itemDto.adicional.length > 0) {
                        for (const addDto of itemDto.adicional) {
                            const adicionalDB = await tx.adicionalProduto.findUnique({
                                where: { id: addDto.id }
                            });

                            if (!adicionalDB) {
                                throw new Error(`Adicional com ID ${addDto.id} não encontrado.`);
                            }

                            adicionaisVenda.push({
                                id: adicionalDB.id,
                                nome: adicionalDB.nome,
                                preco: Number(adicionalDB.preco),
                                qtd: addDto.qtd
                            });
                        }
                    }

                    itensParaCriar.push({
                        produto_id: produto.id,
                        quantidade: itemDto.qtd,
                        preco_produto: produto.preco,
                        adicional_venda: adicionaisVenda
                    });
                }

                const pedidoCriado = await tx.pedido.create({
                    data: {
                        nome_completo: nome_completo,
                        itens: {
                            create: itensParaCriar
                        }
                    },
                    include: {
                        itens: true
                    }
                });

                return {...pedidoCriado, numero: pedidoCriado.numero.toString()};
            });

            this.impressora.print({
                pedido: pedidoCompleto,
                cliente: dto.cliente
            });

            return {
                mensagem: 'Pedido criado com sucesso',
                dados: {
                    pedido: pedidoCompleto
                }
            };

        } catch (erro) {
            console.error('Erro ao criar pedido:', erro);

            if (erro instanceof Error && erro.message.includes('não encontrado')) {
                throw new NotFoundException(erro.message);
            }

            throw new InternalServerErrorException('Não foi possível processar o pedido. Tente novamente.');
        }
    }


    //   async deletarPedido(id: string) {
    //     try {
    //       await this.prismaWrite.produto.delete({ where: { id } })
    //       return { mensagem: "Produto deletado com sucesso" }
    //     } catch (erro) {
    //       console.log('erro', erro)
    //       if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
    //         throw new NotFoundException('Produto não encontrado.');
    //       }

    //       throw new InternalServerErrorException('Não foi possível deletar o produto. Tente novamente.');
    //     }
    //   }
}
