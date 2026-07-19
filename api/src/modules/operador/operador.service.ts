import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { WebsocketGateway } from '../../infra/websocket/websocket.gateway.js';
import { CriarOperadorDto } from './dto/criar.dto.js';
import { EditarOperadorAdminDto } from './dto/editar.dto.js';

const OPERADOR_SELECT = {
  id: true,
  nome: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class OperadorService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly websocket: WebsocketGateway,
  ) {}

  async listar() {
    try {
      const operadores = await this.prismaRead.operador.findMany({
        select: OPERADOR_SELECT,
        orderBy: [{ role: 'asc' }, { nome: 'asc' }],
      });

      return { dados: { operadores } };
    } catch (erro) {
      console.error('Erro ao listar operadores:', erro);
      throw new InternalServerErrorException(
        'Não foi possível listar os usuários. Tente novamente.',
      );
    }
  }

  async criar(dto: CriarOperadorDto) {
    try {
      const nome = dto.nome.trim();

      const existente = await this.prismaRead.operador.findFirst({
        where: { nome: { equals: nome, mode: 'insensitive' } },
        select: { id: true },
      });

      if (existente) {
        throw new BadRequestException('Já existe um usuário com esse nome.');
      }

      const senha = await bcrypt.hash(dto.senha, 10);

      const operador = await this.prismaWrite.operador.create({
        data: { nome, senha, role: dto.role },
        select: OPERADOR_SELECT,
      });

      return { mensagem: 'Usuário criado com sucesso', dados: operador };
    } catch (erro) {
      console.error('Erro ao criar operador:', erro);

      if (erro instanceof BadRequestException) {
        throw erro;
      }

      throw new InternalServerErrorException(
        'Não foi possível criar o usuário. Tente novamente.',
      );
    }
  }

  async editar(id: string, dto: EditarOperadorAdminDto) {
    try {
      const operador = await this.prismaRead.operador.findUnique({
        where: { id },
        select: { id: true, nome: true, role: true },
      });

      if (!operador) {
        throw new NotFoundException('Usuário não encontrado.');
      }

      if (
        dto.role !== undefined &&
        operador.role === 'ADMIN' &&
        dto.role !== 'ADMIN'
      ) {
        await this.garantirNaoUltimoAdmin(id);
      }

      const data: {
        nome?: string;
        senha?: string;
        role?: EditarOperadorAdminDto['role'];
      } = {};

      if (dto.nome !== undefined) {
        const nome = dto.nome.trim();

        const outro = await this.prismaRead.operador.findFirst({
          where: {
            nome: { equals: nome, mode: 'insensitive' },
            id: { not: id },
          },
          select: { id: true },
        });

        if (outro) {
          throw new BadRequestException('Já existe um usuário com esse nome.');
        }

        data.nome = nome;
      }

      if (dto.senha !== undefined) {
        data.senha = await bcrypt.hash(dto.senha, 10);
      }

      if (dto.role !== undefined) {
        data.role = dto.role;
      }

      const atualizado = await this.prismaWrite.operador.update({
        where: { id },
        data,
        select: OPERADOR_SELECT,
      });

      return { mensagem: 'Usuário editado com sucesso', dados: atualizado };
    } catch (erro) {
      console.error('Erro ao editar operador:', erro);

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
        throw new NotFoundException('Usuário não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível editar o usuário. Tente novamente.',
      );
    }
  }

  async deletar(id: string, solicitanteId: string) {
    try {
      if (id === solicitanteId) {
        throw new BadRequestException(
          'Você não pode excluir o seu próprio usuário.',
        );
      }

      const operador = await this.prismaRead.operador.findUnique({
        where: { id },
        select: { id: true, role: true },
      });

      if (!operador) {
        throw new NotFoundException('Usuário não encontrado.');
      }

      if (operador.role === 'ADMIN') {
        await this.garantirNaoUltimoAdmin(id);
      }

      await this.prismaWrite.operador.delete({ where: { id } });

      return { mensagem: 'Usuário excluído com sucesso' };
    } catch (erro) {
      console.error('Erro ao deletar operador:', erro);

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
        throw new NotFoundException('Usuário não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível excluir o usuário. Tente novamente.',
      );
    }
  }

  async forcarLogout(id: string) {
    const operador = await this.prismaRead.operador.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!operador) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    this.websocket.forcarLogout(operador.id);

    return { mensagem: 'Logout solicitado' };
  }

  private async garantirNaoUltimoAdmin(id: string) {
    const outrosAdmins = await this.prismaRead.operador.count({
      where: { role: 'ADMIN', id: { not: id } },
    });

    if (outrosAdmins === 0) {
      throw new BadRequestException(
        'Não é possível remover o último administrador.',
      );
    }
  }
}
