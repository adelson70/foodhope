import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';

import { JwtServiceCustom } from '../../infra/auth/jwt.service.js';
import { LoginDto } from './dto/login.dto.js';
import { EditarOperadorDto } from './dto/editar.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,

    private readonly jwt: JwtServiceCustom,
  ) {}

  async login(dto: LoginDto) {
    const operador = await this.prisma.operador.findFirst({
      where: {
        nome: dto.nome,
      },
    });

    if (!operador) {
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }

    const senhaValida = await bcrypt.compare(dto.senha, operador.senha);

    if (!senhaValida) {
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }

    const token = this.jwt.generate({
      id: operador.id,
    });

    return {
      access_token: token,

      operador: {
        id: operador.id,
        nome: operador.nome,
      },
    };
  }

  async me(id: string) {
    return this.prisma.operador.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        nome: true,
      },
    });
  }

  async editar(id: string, dto: EditarOperadorDto) {
    const operador = await this.prisma.operador.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!operador) {
      throw new NotFoundException('Operador não encontrado');
    }

    const data: { nome?: string; senha?: string } = {};

    if (dto.nome !== undefined) {
      data.nome = dto.nome;
    }

    if (dto.senha !== undefined) {
      data.senha = await bcrypt.hash(dto.senha, 10);
    }

    const atualizado = await this.prismaWrite.operador.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
      },
    });

    return {
      mensagem: 'Operador editado com sucesso',
      dados: atualizado,
    };
  }

  async logout() {
    return {
      message: 'Logout realizado',
    };
  }
}
