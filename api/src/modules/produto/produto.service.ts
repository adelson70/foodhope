import { ListarDto } from './dto/listar.dto.js';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { PrismaReadService } from '../../infra/database/prisma-read.service.js';

import { JwtServiceCustom } from '../../infra/auth/jwt.service.js';
import { CriarDto } from './dto/criar.dto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { EditarDto } from './dto/editar.dto.js';

@Injectable()
export class ProdutoService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,

    private readonly jwt: JwtServiceCustom,
  ) { }

  async listarProduto(dto: ListarDto) {
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

  async buscarProduto(params: string) {
    try {
      if (params.length === 0) { return { mensagem: 'Nenhum produto encontrado', dados: { produtos:[] } } }
      
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

      if (!produtos || produtos.length === 0) { return { mensagem: 'Nenhum produto encontrado', dados: { produtos:[] } } }

      return { dados: { produtos } }

    } catch (erro) {
      console.log('erro', erro);


      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Produto não encontrado.');
      }

      throw new InternalServerErrorException('Não foi possível listar os produtos. Tente novamente.');
    }
  }

  async criarProduto(dto: CriarDto) {
    try {
      const temAdicionais = dto.adicionais && dto.adicionais.length > 0;

      const produtoCompleto = await this.prismaWrite.$transaction(async (tx) => {

        const novoProduto = await tx.produto.create({
          data: {
            nome: dto.nome,
            descricao: dto.descricao,
            preco: dto.preco,
          }
        });

        if (temAdicionais && dto.adicionais) {
          const adicionaisMapeados = dto.adicionais.map((adicional) => ({
            nome: adicional.nome,
            preco: adicional.preco,
            produto_id: novoProduto.id,
          }));

          await tx.adicionalProduto.createMany({
            data: adicionaisMapeados
          });
        }

        return tx.produto.findUnique({
          where: { id: novoProduto.id },
          omit: { createdAt: true, updatedAt: true },
          include: { adicionais: { select: { id: true, nome: true, preco: true } } },
        });
      });

      return { dados: produtoCompleto, mensagem: "Produto criado com sucesso" };

    } catch (erro) {

      console.error('Erro na transação de produto:', erro);

      throw new InternalServerErrorException('Não foi possível criar o produto. Tente novamente.');
    }
  }

  async editarProduto(id: string, dto: EditarDto) {
    try {
      const produtoEditado = await this.prismaWrite.produto.update({ where: { id }, data: dto })

      return { mensagem: "Produto editado com sucesso", dados: produtoEditado }

    } catch (erro) {

      console.error('Erro na transação de produto:', erro);

      throw new InternalServerErrorException('Não foi possível editar o produto. Tente novamente.');
    }
  }

  async deletarProduto(id: string) {
    try {
      await this.prismaWrite.produto.delete({ where: { id } })
      return { mensagem: "Produto deletado com sucesso" }
    } catch (erro) {
      console.log('erro', erro)
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Produto não encontrado.');
      }

      throw new InternalServerErrorException('Não foi possível deletar o produto. Tente novamente.');
    }
  }
}
