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
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';

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

type CategoriaRow = {
  id: string;
  nome: string;
  ordem: number;
} | null;

type ProdutoComAdicionais = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: Prisma.Decimal | number;
  imagemUrl: string | null;
  ativo: boolean;
  ordem?: number;
  categoria_id?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  categoria?: CategoriaRow;
  adicionais: AdicionalEspecificoRow[];
  adicionaisGlobais: AdicionalGlobalVinculoRow[];
};

const produtoAdicionaisInclude = {
  categoria: {
    select: { id: true, nome: true, ordem: true },
  },
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

const produtoOrderBy = [
  { categoria: { ordem: 'asc' as const } },
  { ordem: 'asc' as const },
  { id: 'asc' as const },
];

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

  const especificos = adicionaisEspecificos.map((a) => ({
    id: a.id,
    nome: a.nome,
    preco: a.preco,
    ativo: a.ativo,
  }));

  const globais = produto.adicionaisGlobais.map((v) => ({
    id: v.adicionalGlobal.id,
    nome: v.adicionalGlobal.nome,
    preco: v.adicionalGlobal.preco,
    ativo: v.adicionalGlobal.ativo,
  }));

  const {
    adicionais: _a,
    adicionaisGlobais: _g,
    categoria_id: _cid,
    categoria,
    ...rest
  } = produto;

  return {
    ...rest,
    categoria: categoria
      ? { id: categoria.id, nome: categoria.nome, ordem: categoria.ordem }
      : null,
    adicionais: [...especificos, ...globais],
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
    private readonly websocket: WebsocketGateway,
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

  private async validarCategoriaId(
    tx: Prisma.TransactionClient,
    categoriaId: string | null | undefined,
  ) {
    if (categoriaId === undefined || categoriaId === null) {
      return categoriaId;
    }

    const categoria = await tx.categoria.findUnique({
      where: { id: categoriaId },
      select: { id: true },
    });

    if (!categoria) {
      throw new BadRequestException('Categoria informada não existe.');
    }

    return categoriaId;
  }

  private async proximaOrdemNoGrupo(
    tx: Prisma.TransactionClient,
    categoriaId: string | null,
  ) {
    const agregacao = await tx.produto.aggregate({
      where:
        categoriaId === null
          ? { categoria_id: null }
          : { categoria_id: categoriaId },
      _max: { ordem: true },
    });
    return (agregacao._max.ordem ?? -1) + 1;
  }

  private async compactarGrupo(
    tx: Prisma.TransactionClient,
    categoriaId: string | null,
  ) {
    const doGrupo = await tx.produto.findMany({
      where:
        categoriaId === null
          ? { categoria_id: null }
          : { categoria_id: categoriaId },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    for (let index = 0; index < doGrupo.length; index += 1) {
      await tx.produto.update({
        where: { id: doGrupo[index].id },
        data: { ordem: index },
      });
    }
  }

  private async reordenarNoGrupo(
    tx: Prisma.TransactionClient,
    id: string,
    categoriaId: string | null,
    ordemNova: number,
  ) {
    const doGrupo = await tx.produto.findMany({
      where:
        categoriaId === null
          ? { categoria_id: null }
          : { categoria_id: categoriaId },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (ordemNova >= doGrupo.length) {
      throw new BadRequestException('Ordem inválida.');
    }

    const semAtual = doGrupo.filter((p) => p.id !== id);
    const reordenados = [
      ...semAtual.slice(0, ordemNova),
      { id },
      ...semAtual.slice(ordemNova),
    ];

    for (let index = 0; index < reordenados.length; index += 1) {
      await tx.produto.update({
        where: { id: reordenados[index].id },
        data: { ordem: index },
      });
    }
  }

  async listarProduto(dto: ListarDto) {
    try {
      const limit = dto.limit || 10;
      const cursorStr = dto.cursor;

      let decodedCursor: { id: string } | null = null;

      if (cursorStr) {
        try {
          const jsonString = Buffer.from(cursorStr, 'base64').toString('utf-8');
          decodedCursor = JSON.parse(jsonString);
          if (!decodedCursor?.id) {
            throw new Error('cursor incompleto');
          }
        } catch {
          throw new BadRequestException('O cursor fornecido é inválido.');
        }
      }

      const [produtos, categorias, semCategoria] = await Promise.all([
        this.prismaRead.produto.findMany({
          take: limit + 1,
          cursor: decodedCursor ? { id: decodedCursor.id } : undefined,
          skip: decodedCursor ? 1 : 0,
          orderBy: produtoOrderBy,
          include: produtoAdicionaisInclude,
        }),
        decodedCursor
          ? Promise.resolve(null)
          : this.prismaRead.categoria.findMany({
              orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
              select: { id: true, nome: true, ordem: true },
            }),
        decodedCursor
          ? Promise.resolve(null)
          : this.prismaRead.produto.findFirst({
              where: { categoria_id: null },
              select: { id: true },
            }),
      ]);

      let nextCursor: string | null = null;
      const hasNextPage = produtos.length > limit;

      if (hasNextPage) {
        produtos.pop();
        const lastItem = produtos[produtos.length - 1];
        const cursorPayload = JSON.stringify({ id: lastItem.id });
        nextCursor = Buffer.from(cursorPayload).toString('base64');
      }

      return {
        data: produtos.map((p) =>
          montarRespostaProduto(p as ProdutoComAdicionais),
        ),
        meta: {
          hasNextPage,
          nextCursor,
          ...(categorias
            ? {
                categorias,
                temOutros: Boolean(semCategoria),
              }
            : {}),
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
        orderBy: produtoOrderBy,
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

        const categoriaId = await this.validarCategoriaId(tx, dto.categoriaId);
        const ordem = await this.proximaOrdemNoGrupo(tx, categoriaId ?? null);

        const novoProduto = await tx.produto.create({
          data: {
            nome: dto.nome,
            descricao: dto.descricao,
            preco: dto.preco,
            ativo: dto.ativo ?? true,
            ordem,
            ...(categoriaId
              ? { categoria: { connect: { id: categoriaId } } }
              : {}),
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
      let ativoAnterior: boolean | undefined;
      const adicionaisAtivoAntes = new Map<string, boolean>();

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

        ativoAnterior = existente.ativo;
        for (const a of existente.adicionais) {
          adicionaisAtivoAntes.set(a.id, a.ativo);
        }

        const categoriaAnterior = existente.categoria_id;
        let mudouCategoria = false;

        if (
          dto.ordem !== undefined &&
          dto.ordem !== existente.ordem &&
          dto.categoriaId === undefined
        ) {
          await this.reordenarNoGrupo(
            tx,
            id,
            existente.categoria_id,
            dto.ordem,
          );
        }

        const dadosUpdate: Prisma.ProdutoUpdateInput = {};

        if (dto.nome !== undefined) dadosUpdate.nome = dto.nome;
        if (dto.descricao !== undefined) {
          dadosUpdate.descricao = dto.descricao.trim() === '' ? null : dto.descricao;
        }
        if (dto.preco !== undefined) dadosUpdate.preco = dto.preco;
        if (dto.ativo !== undefined) dadosUpdate.ativo = dto.ativo;

        if (dto.categoriaId !== undefined) {
          const categoriaId = await this.validarCategoriaId(tx, dto.categoriaId);
          const categoriaNova = categoriaId ?? null;

          if (categoriaAnterior !== categoriaNova) {
            mudouCategoria = true;
            dadosUpdate.categoria =
              categoriaNova === null
                ? { disconnect: true }
                : { connect: { id: categoriaNova } };
            dadosUpdate.ordem = await this.proximaOrdemNoGrupo(
              tx,
              categoriaNova,
            );
          }
        }

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

        if (mudouCategoria) {
          await this.compactarGrupo(tx, categoriaAnterior);
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

      if (
        dto.ativo !== undefined &&
        ativoAnterior !== undefined &&
        dto.ativo !== ativoAnterior
      ) {
        this.websocket.emitirProdutoAtivo({
          id,
          ativo: dto.ativo,
        });
      }

      if (dto.adicionais) {
        for (const a of dto.adicionais) {
          if (
            a.id &&
            !a.foiDeletado &&
            a.ativo !== undefined &&
            adicionaisAtivoAntes.has(a.id) &&
            a.ativo !== adicionaisAtivoAntes.get(a.id)
          ) {
            this.websocket.emitirAdicionalAtivo({
              id: a.id,
              ativo: a.ativo,
              escopo: 'produto',
              produtoId: id,
            });
          }
        }
      }

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

  async removerImagemProduto(id: string) {
    try {
      await this.prismaWrite.produto.findUniqueOrThrow({ where: { id } });

      await this.produtoImagem.remover(id);

      const produto = await this.prismaWrite.produto.update({
        where: { id },
        data: { imagemUrl: null },
        include: produtoAdicionaisInclude,
      });

      return {
        mensagem: 'Imagem do produto removida com sucesso',
        dados: montarRespostaProduto(produto as ProdutoComAdicionais),
      };
    } catch (erro) {
      console.error('Erro ao remover imagem do produto:', erro);

      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Produto não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível remover a imagem do produto. Tente novamente.',
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
