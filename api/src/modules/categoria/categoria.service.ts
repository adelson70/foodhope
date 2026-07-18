import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { CriarCategoriaDto } from './dto/criar.dto.js';
import { EditarCategoriaDto } from './dto/editar.dto.js';

@Injectable()
export class CategoriaService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async listar() {
    try {
      const categorias = await this.prismaRead.categoria.findMany({
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
      });

      return { dados: { categorias } };
    } catch (erro) {
      console.error('Erro ao listar categorias:', erro);
      throw new InternalServerErrorException(
        'Não foi possível listar as categorias. Tente novamente.',
      );
    }
  }

  async criar(dto: CriarCategoriaDto) {
    try {
      const agregacao = await this.prismaRead.categoria.aggregate({
        _max: { ordem: true },
      });
      const proximaOrdem = (agregacao._max.ordem ?? -1) + 1;

      const categoria = await this.prismaWrite.categoria.create({
        data: {
          nome: dto.nome.trim(),
          ordem: proximaOrdem,
        },
      });

      return { mensagem: 'Categoria criada com sucesso', dados: categoria };
    } catch (erro) {
      console.error('Erro ao criar categoria:', erro);

      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe uma categoria com esse nome.');
      }

      throw new InternalServerErrorException(
        'Não foi possível criar a categoria. Tente novamente.',
      );
    }
  }

  async editar(id: string, dto: EditarCategoriaDto) {
    try {
      const existente = await this.prismaRead.categoria.findUnique({
        where: { id },
      });

      if (!existente) {
        throw new NotFoundException('Categoria não encontrada.');
      }

      if (dto.ordem !== undefined && dto.ordem !== existente.ordem) {
        return this.reordenar(id, existente.ordem, dto.ordem, dto.nome);
      }

      const data: { nome?: string } = {};
      if (dto.nome !== undefined) data.nome = dto.nome.trim();

      const categoria = await this.prismaWrite.categoria.update({
        where: { id },
        data,
      });

      return { mensagem: 'Categoria editada com sucesso', dados: categoria };
    } catch (erro) {
      console.error('Erro ao editar categoria:', erro);

      if (
        erro instanceof NotFoundException ||
        erro instanceof BadRequestException
      ) {
        throw erro;
      }

      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2025'
      ) {
        throw new NotFoundException('Categoria não encontrada.');
      }

      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe uma categoria com esse nome.');
      }

      throw new InternalServerErrorException(
        'Não foi possível editar a categoria. Tente novamente.',
      );
    }
  }

  private async reordenar(
    id: string,
    _ordemAtual: number,
    ordemNova: number,
    nome?: string,
  ) {
    const categorias = await this.prismaRead.categoria.findMany({
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
    });

    if (ordemNova >= categorias.length) {
      throw new BadRequestException('Ordem inválida.');
    }

    const semAtual = categorias.filter((c) => c.id !== id);
    const reordenadas = [
      ...semAtual.slice(0, ordemNova),
      { id, nome: nome?.trim() ?? categorias.find((c) => c.id === id)!.nome, ordem: ordemNova },
      ...semAtual.slice(ordemNova),
    ];

    await this.prismaWrite.$transaction(
      reordenadas.map((item, index) =>
        this.prismaWrite.categoria.update({
          where: { id: item.id },
          data: {
            ordem: index,
            ...(item.id === id && nome !== undefined
              ? { nome: nome.trim() }
              : {}),
          },
        }),
      ),
    );

    const categoria = await this.prismaWrite.categoria.findUniqueOrThrow({
      where: { id },
    });

    return { mensagem: 'Categoria editada com sucesso', dados: categoria };
  }

  async deletar(id: string) {
    try {
      await this.prismaWrite.categoria.delete({ where: { id } });

      const restantes = await this.prismaWrite.categoria.findMany({
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
      });

      if (restantes.length > 0) {
        await this.prismaWrite.$transaction(
          restantes.map((item, index) =>
            this.prismaWrite.categoria.update({
              where: { id: item.id },
              data: { ordem: index },
            }),
          ),
        );
      }

      return { mensagem: 'Categoria excluída com sucesso' };
    } catch (erro) {
      console.error('Erro ao deletar categoria:', erro);

      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2025'
      ) {
        throw new NotFoundException('Categoria não encontrada.');
      }

      throw new InternalServerErrorException(
        'Não foi possível excluir a categoria. Tente novamente.',
      );
    }
  }
}
