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

type AdicionalEspecificoRow = {
  id: string;
  nome: string;
  preco: Prisma.Decimal | number;
  ativo: boolean;
};

type AdicionalGlobalVinculoRow = {
  adicional_global_id: string;
  adicionalGlobal: {
    id: string;
    nome: string;
    preco: Prisma.Decimal | number;
    ativo: boolean;
  };
};

type ProdutoComAdicionais = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: Prisma.Decimal | number;
  imagemUrl: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  adicionais: AdicionalEspecificoRow[];
  adicionaisGlobais: AdicionalGlobalVinculoRow[];
};

const produtoAdicionaisInclude = {
  adicionais: {
    select: { id: true, nome: true, preco: true, ativo: true },
    orderBy: [{ nome: 'asc' as const }, { id: 'asc' as const }],
  },
  adicionaisGlobais: {
    select: {
      adicional_global_id: true,
      adicionalGlobal: {
        select: { id: true, nome: true, preco: true, ativo: true },
      },
    },
  },
} satisfies Prisma.ProdutoInclude;

function normalizarNome(nome: string) {
  return nome.trim().toLowerCase();
}

function montarRespostaProduto(produto: ProdutoComAdicionais) {
  const adicionaisEspecificos = produto.adicionais.map((a) => ({
    id: a.id,
    nome: a.nome,
    preco: a.preco,
    ativo: a.ativo,
  }));

  const adicionalGlobalIds = produto.adicionaisGlobais.map(
    (v) => v.adicional_global_id,
  );

  const especificosAtivos = adicionaisEspecificos
    .filter((a) => a.ativo)
    .map((a) => ({ id: a.id, nome: a.nome, preco: a.preco }));

  const globaisAtivos = produto.adicionaisGlobais
    .filter((v) => v.adicionalGlobal.ativo)
    .map((v) => ({
      id: v.adicionalGlobal.id,
      nome: v.adicionalGlobal.nome,
      preco: v.adicionalGlobal.preco,
    }));

  const { adicionais: _a, adicionaisGlobais: _g, ...rest } = produto;

  return {
    ...rest,
    adicionais: [...especificosAtivos, ...globaisAtivos],
    adicionaisEspecificos,
    adicionalGlobalIds,
  };
}

@Injectable()
export class ProdutoService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,

    private readonly jwt: JwtServiceCustom,
    private readonly produtoImagem: ProdutoImagemService,
  ) {}

  private async validarGlobaisEColisao(
    tx: Prisma.TransactionClient,
    adicionalGlobalIds: string[] | undefined,
    nomesEspecificos: string[],
  ) {
    const ids = [...new Set(adicionalGlobalIds ?? [])];

    if (ids.length === 0) {
      return ids;
    }

    const globais = await tx.adicionalGlobal.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });

    if (globais.length !== ids.length) {
      throw new BadRequestException(
        'Um ou mais adicionais globais informados não existem.',
      );
    }

    const nomesEspecificosSet = new Set(
      nomesEspecificos.map(normalizarNome).filter((n) => n.length > 0),
    );

    for (const global of globais) {
      if (nomesEspecificosSet.has(normalizarNome(global.nome))) {
        throw new BadRequestException(
          `O adicional específico "${global.nome}" conflita com um adicional global vinculado.`,
        );
      }
    }

    return ids;
  }

  private async sincronizarGlobais(
    tx: Prisma.TransactionClient,
    produtoId: string,
    adicionalGlobalIds: string[],
  ) {
    await tx.produtoAdicionalGlobal.deleteMany({
      where: { produto_id: produtoId },
    });

    if (adicionalGlobalIds.length === 0) return;

    await tx.produtoAdicionalGlobal.createMany({
      data: adicionalGlobalIds.map((adicional_global_id) => ({
        produto_id: produtoId,
        adicional_global_id,
      })),
    });
  }

  async listarProduto(dto: ListarDto) {
    try {
      const limit = dto.limit || 10;
      const cursorStr = dto.cursor;

      let decodedCursor: { id: string; createdAt: string | Date } | null = null;

      if (cursorStr) {
        try {
          const jsonString = Buffer.from(cursorStr, 'base64').toString('utf-8');
          decodedCursor = JSON.parse(jsonString);
        } catch {
          throw new BadRequestException('O cursor fornecido é inválido.');
        }
      }

      const produtos = await this.prismaRead.produto.findMany({
        take: limit + 1,
        cursor: decodedCursor ? { id: decodedCursor.id } : undefined,
        skip: decodedCursor ? 1 : 0,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: produtoAdicionaisInclude,
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
        data: produtos.map((p) => montarRespostaProduto(p as ProdutoComAdicionais)),
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
        include: produtoAdicionaisInclude,
      });

      if (!produtos || produtos.length === 0) {
        return { mensagem: 'Nenhum produto encontrado', dados: { produtos: [] } };
      }

      return {
        dados: {
          produtos: produtos.map((p) =>
            montarRespostaProduto(p as ProdutoComAdicionais),
          ),
        },
      };
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
      const produtoCriado = await this.prismaWrite.$transaction(async (tx) => {
        const nomesEspecificos = (dto.adicionais ?? [])
          .filter((a) => a.ativo !== false)
          .map((a) => a.nome);

        const globalIds = await this.validarGlobaisEColisao(
          tx,
          dto.adicionalGlobalIds,
          nomesEspecificos,
        );

        const novoProduto = await tx.produto.create({
          data: {
            nome: dto.nome,
            descricao: dto.descricao,
            preco: dto.preco,
          },
        });

        if (dto.adicionais && dto.adicionais.length > 0) {
          await tx.adicionalProduto.createMany({
            data: dto.adicionais.map((adicional) => ({
              nome: adicional.nome,
              preco: adicional.preco,
              ativo: adicional.ativo ?? true,
              produto_id: novoProduto.id,
            })),
          });
        }

        await this.sincronizarGlobais(tx, novoProduto.id, globalIds);

        return novoProduto;
      });

      const produtoCompleto = await this.prismaWrite.produto.findUnique({
        where: { id: produtoCriado.id },
        omit: { createdAt: true, updatedAt: true },
        include: produtoAdicionaisInclude,
      });

      return {
        dados: montarRespostaProduto(produtoCompleto as ProdutoComAdicionais),
        mensagem: 'Produto criado com sucesso',
      };
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
      const produtoEditado = await this.prismaWrite.$transaction(async (tx) => {
        const existente = await tx.produto.findUnique({
          where: { id },
          include: {
            adicionais: { select: { id: true, nome: true, ativo: true } },
          },
        });

        if (!existente) {
          throw new NotFoundException('Produto não encontrado.');
        }

        const dadosUpdate: Prisma.ProdutoUpdateInput = {};

        if (dto.nome !== undefined) dadosUpdate.nome = dto.nome;
        if (dto.descricao !== undefined) {
          dadosUpdate.descricao = dto.descricao.trim() === '' ? null : dto.descricao;
        }
        if (dto.preco !== undefined) dadosUpdate.preco = dto.preco;

        if (dto.adicionais && dto.adicionais.length > 0) {
          const deletados = dto.adicionais.filter((a) => a.foiDeletado && a.id);
          const editados = dto.adicionais.filter(
            (a) =>
              !a.foiDeletado &&
              a.id &&
              (a.nome !== undefined || a.preco !== undefined || a.ativo !== undefined),
          );
          const novos = dto.adicionais.filter((a) => !a.foiDeletado && !a.id);

          const adicionaisNested: Prisma.AdicionalProdutoUpdateManyWithoutProdutoNestedInput =
            {};

          if (deletados.length > 0) {
            adicionaisNested.delete = deletados.map((a) => ({ id: a.id! }));
          }

          if (editados.length > 0) {
            adicionaisNested.update = editados.map((a) => {
              const data: { nome?: string; preco?: number; ativo?: boolean } = {};
              if (a.nome !== undefined) data.nome = a.nome;
              if (a.preco !== undefined) data.preco = a.preco;
              if (a.ativo !== undefined) data.ativo = a.ativo;
              return { where: { id: a.id! }, data };
            });
          }

          if (novos.length > 0) {
            adicionaisNested.create = novos.map((a) => ({
              nome: a.nome!,
              preco: a.preco!,
              ativo: a.ativo ?? true,
            }));
          }

          dadosUpdate.adicionais = adicionaisNested;
        }

        if (Object.keys(dadosUpdate).length > 0) {
          await tx.produto.update({
            where: { id },
            data: dadosUpdate,
          });
        }

        if (dto.adicionalGlobalIds !== undefined || dto.adicionais !== undefined) {
          const aposUpdate = await tx.produto.findUniqueOrThrow({
            where: { id },
            include: {
              adicionais: { select: { nome: true, ativo: true } },
              adicionaisGlobais: { select: { adicional_global_id: true } },
            },
          });

          const nomesEspecificos = aposUpdate.adicionais
            .filter((a) => a.ativo)
            .map((a) => a.nome);

          const idsParaValidar =
            dto.adicionalGlobalIds !== undefined
              ? dto.adicionalGlobalIds
              : aposUpdate.adicionaisGlobais.map((v) => v.adicional_global_id);

          const globalIds = await this.validarGlobaisEColisao(
            tx,
            idsParaValidar,
            nomesEspecificos,
          );

          if (dto.adicionalGlobalIds !== undefined) {
            await this.sincronizarGlobais(tx, id, globalIds);
          }
        }

        return tx.produto.findUniqueOrThrow({
          where: { id },
          include: produtoAdicionaisInclude,
        });
      });

      return {
        mensagem: 'Produto editado com sucesso',
        dados: montarRespostaProduto(produtoEditado as ProdutoComAdicionais),
      };
    } catch (erro) {
      console.error('Erro na transação de produto:', erro);

      if (erro instanceof BadRequestException || erro instanceof NotFoundException) {
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
        include: produtoAdicionaisInclude,
      });

      return {
        mensagem: 'Imagem do produto atualizada com sucesso',
        dados: montarRespostaProduto(produto as ProdutoComAdicionais),
      };
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
