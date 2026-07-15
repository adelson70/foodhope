import { Injectable, UnauthorizedException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';

import { JwtServiceCustom } from '../../infra/auth/jwt.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaReadService,

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

  async logout() {
    return {
      message: 'Logout realizado',
    };
  }
}
