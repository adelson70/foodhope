import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import { JwtGuard } from '../../infra/auth/jwt.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { EditarDto } from './dto/editar.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Realiza o login do usuário' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Realiza o logout do usuário' })
  async logout() {
    return this.auth.logout();
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edita nome e/ou senha do operador autenticado' })
  @ApiBody({ type: EditarDto })
  async editar(@Req() req: any, @Body() dto: EditarDto) {
    if (!dto.nome && !dto.senha) {
      return { mensagem: 'Nada para editar :)' };
    }

    return this.auth.editar(req.user.id, dto);
  }
}
