import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RelatorioDto } from './dto/relatorio.dto.js';
import { DashService } from './dash.service.js';

@ApiTags('Dash')
@Controller('dash')
export class DashController {
  constructor(private readonly dash: DashService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resumo do dashboard do operador' })
  async obter() {
    return this.dash.obterResumo();
  }

  @Post('relatorio')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gera e imprime o relatório do dia na impressora térmica',
  })
  async gerarRelatorio(@Body() dto: RelatorioDto) {
    return this.dash.gerarRelatorio(dto.tipo ?? 'resumido');
  }
}
