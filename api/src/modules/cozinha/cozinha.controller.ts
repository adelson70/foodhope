import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
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
  async atualizar(@Body() dto: AtualizarCozinhaDto) {
    return this.cozinha.atualizar(dto.ativa);
  }
}
