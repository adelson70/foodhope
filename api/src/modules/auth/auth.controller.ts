import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import { Public } from '../../common/decorator/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { EditarOperadorDto } from './dto/editar.dto.js';
import type { AuthUser } from '../../infra/auth/auth.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Realiza o login do usuário' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Realiza o logout do usuário' })
  async logout() {
    return this.auth.logout();
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  async me(@Req() req: { user: AuthUser }) {
    return this.auth.me(req.user.id);
  }

  @Put('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edita nome e/ou senha do operador autenticado' })
  @ApiBody({ type: EditarOperadorDto })
  async editar(@Req() req: { user: AuthUser }, @Body() dto: EditarOperadorDto) {
    if (!dto.nome && !dto.senha) {
      return { mensagem: 'Nada para editar :)' };
    }

    return this.auth.editar(req.user.id, dto);
  }
}
