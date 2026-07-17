import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ConfigurarImpressoraDto } from './dto/configurar.dto.js';
import { ImpressoraService } from './impressora.service.js';

@ApiTags('Impressora')
@ApiBearerAuth()
@Controller('impressora')
export class ImpressoraController {
  constructor(private readonly impressora: ImpressoraService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna o IP configurado da impressora' })
  async obter() {
    return this.impressora.obter();
  }

  @Post('testar')
  @ApiOperation({ summary: 'Testa a conexão TCP com a impressora' })
  @ApiBody({ type: ConfigurarImpressoraDto })
  async testar(@Body() dto: ConfigurarImpressoraDto) {
    return this.impressora.testar(dto);
  }

  @Put()
  @ApiOperation({ summary: 'Salva o IP da impressora após validar a conexão' })
  @ApiBody({ type: ConfigurarImpressoraDto })
  async salvar(@Body() dto: ConfigurarImpressoraDto) {
    return this.impressora.salvar(dto);
  }
}
