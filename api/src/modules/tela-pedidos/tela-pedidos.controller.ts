import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorator/public.decorator.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { TelaPedidosService } from './tela-pedidos.service.js';

@ApiTags('Tela de pedidos')
@Controller('tela-pedidos')
export class TelaPedidosController {
  constructor(private readonly telaPedidos: TelaPedidosService) {}

  @Get()
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retorna o hash/URL da tela pública de pedidos' })
  async obter() {
    return this.telaPedidos.obterConfig();
  }

  @Post('regenerar')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Regenera o hash da tela pública (invalida links antigos)' })
  async regenerar() {
    return this.telaPedidos.regenerarHash();
  }

  @Get(':hash')
  @Public()
  @ApiOperation({ summary: 'Lista pedidos prontos do dia (tela pública por hash)' })
  async listarPorHash(@Param('hash') hash: string) {
    return this.telaPedidos.listarPorHash(hash);
  }
}
