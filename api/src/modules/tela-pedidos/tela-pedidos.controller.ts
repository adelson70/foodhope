import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorator/public.decorator.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { AtualizarVisualizacaoTelaPedidosDto } from './dto/atualizar-visualizacao.dto.js';
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

  @Put()
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Atualiza a visualização da tela (DIA ou TUDO)',
  })
  @ApiBody({ type: AtualizarVisualizacaoTelaPedidosDto })
  async atualizar(@Body() dto: AtualizarVisualizacaoTelaPedidosDto) {
    return this.telaPedidos.atualizarVisualizacao(dto.visualizacao);
  }

  @Post('regenerar')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Regenera o hash da tela pública (invalida links antigos)' })
  async regenerar() {
    return this.telaPedidos.regenerarHash();
  }

  @Post('refresh')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Força as TVs/kiosks a recarregarem a listagem de pedidos',
  })
  async forcarRefresh() {
    return this.telaPedidos.forcarRefresh();
  }

  @Get(':hash')
  @Public()
  @ApiOperation({ summary: 'Lista pedidos com status pronto (tela pública por hash)' })
  async listarPorHash(@Param('hash') hash: string) {
    return this.telaPedidos.listarPorHash(hash);
  }
}
