import { ListarDto } from './dto/listar.dto.js';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { PrismaReadService } from '../../infra/database/prisma-read.service.js';

import { JwtServiceCustom } from '../../infra/auth/jwt.service.js';
import { CriarDto } from './dto/criar.dto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { EditarProdutoDto } from './dto/editar.dto.js';
import { ProdutoImagemService } from './produto-imagem.service.js';

@Injectable()
export class ProdutoService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,

    private readonly jwt: JwtServiceCustom,
    private readonly produtoImagem: ProdutoImagemService,
  ) {}

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

        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],

        include: {
          adicionais: { select: { id: true, nome: true, preco: true } },
        },
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

      throw new InternalServerErrorException(
        'Não foi possível listar os produtos. Tente novamente.',
      );
    }
  }

  async buscarProduto(params: string) {
    try {
      if (params.length === 0) {
        return { mensagem: 'Nenhum produto encontrado', dados: { produtos: [] } };
      }

      const produtos = await this.prismaRead.produto.findMany({
        where: {
          OR: [
            {
              nome: {
                contains: params,
                mode: 'insensitive',
              },
            },
            {
              descricao: {
                contains: params,
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          adicionais: { select: { id: true, nome: true, preco: true } },
        },
      });

      if (!produtos || produtos.length === 0) {
        return { mensagem: 'Nenhum produto encontrado', dados: { produtos: [] } };
      }

      return { dados: { produtos } };
    } catch (erro) {
      console.log('erro', erro);

      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Produto não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível listar os produtos. Tente novamente.',
      );
    }
  }

  async criarProduto(dto: CriarDto) {
    try {
      const temAdicionais = dto.adicionais && dto.adicionais.length > 0;

      const produtoCriado = await this.prismaWrite.$transaction(async (tx) => {
        const novoProduto = await tx.produto.create({
          data: {
            nome: dto.nome,
            descricao: dto.descricao,
            preco: dto.preco,
          },
        });

        if (temAdicionais && dto.adicionais) {
          const adicionaisMapeados = dto.adicionais.map((adicional) => ({
            nome: adicional.nome,
            preco: adicional.preco,
            produto_id: novoProduto.id,
          }));

          await tx.adicionalProduto.createMany({
            data: adicionaisMapeados,
          });
        }

        return novoProduto;
      });

      const produtoCompleto = await this.prismaWrite.produto.findUnique({
        where: { id: produtoCriado.id },
        omit: { createdAt: true, updatedAt: true },
        include: { adicionais: { select: { id: true, nome: true, preco: true } } },
      });

      return { dados: produtoCompleto, mensagem: 'Produto criado com sucesso' };
    } catch (erro) {
      console.error('Erro na transação de produto:', erro);

      if (erro instanceof BadRequestException) {
        throw erro;
      }

      throw new InternalServerErrorException('Não foi possível criar o produto. Tente novamente.');
    }
  }

  async editarProduto(id: string, dto: EditarProdutoDto) {
    try {
      const dadosUpdate: Record<string, unknown> = {};

      if (dto.nome !== undefined) dadosUpdate.nome = dto.nome;
      if (dto.descricao !== undefined) {
        dadosUpdate.descricao = dto.descricao.trim() === '' ? null : dto.descricao;
      }
      if (dto.preco !== undefined) dadosUpdate.preco = dto.preco;

      if (dto.adicionais && dto.adicionais.length > 0) {
        const deletados = dto.adicionais.filter((a) => a.foiDeletado && a.id);

        const editados = dto.adicionais.filter(
          (a) => !a.foiDeletado && a.id && (a.nome !== undefined || a.preco !== undefined),
        );

        const novos = dto.adicionais.filter((a) => !a.foiDeletado && !a.id);

        const adicionaisUpdate: {
          delete?: { id: string }[];
          update?: { where: { id: string }; data: { nome?: string; preco?: number } }[];
          create?: { nome: string; preco: number }[];
        } = {};

        if (deletados.length > 0) {
          adicionaisUpdate.delete = deletados.map((a) => ({ id: a.id! }));
        }

        if (editados.length > 0) {
          adicionaisUpdate.update = editados.map((a) => {
            const dadosParaAtualizar: { nome?: string; preco?: number } = {};
            if (a.nome !== undefined) dadosParaAtualizar.nome = a.nome;
            if (a.preco !== undefined) dadosParaAtualizar.preco = a.preco;

            return {
              where: { id: a.id! },
              data: dadosParaAtualizar,
            };
          });
        }

        if (novos.length > 0) {
          adicionaisUpdate.create = novos.map((a) => ({
            nome: a.nome!,
            preco: a.preco!,
          }));
        }

        dadosUpdate.adicionais = adicionaisUpdate;
      }

      const produtoEditadoCompleto = await this.prismaWrite.produto.update({
        where: { id },
        data: dadosUpdate,
        include: {
          adicionais: true,
        },
      });

      return { mensagem: 'Produto editado com sucesso', dados: produtoEditadoCompleto };
    } catch (erro) {
      console.error('Erro na transação de produto:', erro);

      if (erro instanceof BadRequestException) {
        throw erro;
      }

      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException(
          'O produto ou um dos adicionais informados não foi encontrado no banco de dados.',
        );
      }

      throw new InternalServerErrorException('Não foi possível editar o produto. Tente novamente.');
    }
  }

  async editarImagemProduto(id: string, file: Express.Multer.File) {
    try {
      await this.prismaWrite.produto.findUniqueOrThrow({ where: { id } });

      const imagemUrl = await this.produtoImagem.salvar(id, file);

      const produto = await this.prismaWrite.produto.update({
        where: { id },
        data: { imagemUrl },
        include: { adicionais: true },
      });

      return { mensagem: 'Imagem do produto atualizada com sucesso', dados: produto };
    } catch (erro) {
      console.error('Erro ao editar imagem do produto:', erro);

      if (erro instanceof BadRequestException) {
        throw erro;
      }

      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Produto não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível atualizar a imagem do produto. Tente novamente.',
      );
    }
  }

  async deletarProduto(id: string) {
    try {
      await this.prismaWrite.produto.delete({ where: { id } });
      await this.produtoImagem.remover(id);
      return { mensagem: 'Produto deletado com sucesso' };
    } catch (erro) {
      console.log('erro', erro);
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Produto não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível deletar o produto. Tente novamente.',
      );
    }
  }
}
