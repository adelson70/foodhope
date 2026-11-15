import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import type { AuthUser } from '../../infra/auth/auth.guard.js';
import { AtualizarCozinhaDto } from './dto/atualizar-cozinha.dto.js';
import { CozinhaService } from './cozinha.service.js';

@ApiTags('Cozinha')
@Controller('cozinha')
export class CozinhaController {
  constructor(private readonly cozinha: CozinhaService) {}

  @Get()
  @Auth('jwt-or-visitor')
  @ApiOperation({
    summary: 'Retorna se a cozinha/loja está aberta para compras',
  })
  async obter() {
    return this.cozinha.obter();
  }

  @Put()
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ativa ou desativa a cozinha (loja aberta/fechada)' })
  @ApiBody({ type: AtualizarCozinhaDto })
  async atualizar(@Body() dto: AtualizarCozinhaDto, @Req() req: { user?: AuthUser }) {
    const operadorId = req.user?.tipo === 'operador' ? req.user.id : undefined;
    return this.cozinha.atualizar(dto, operadorId);
  }

  @Get('abertura')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Última abertura de caixa (dinheiro para troco)' })
  async abertura() {
    return this.cozinha.ultimaAbertura();
  }
}
