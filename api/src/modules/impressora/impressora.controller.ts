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
  @ApiOperation({ summary: 'Retorna a configuração da impressora' })
  async obter() {
    return this.impressora.obter();
  }

  @Get('portas')
  @ApiOperation({ summary: 'Lista dispositivos locais de impressora disponíveis' })
  async listarPortas() {
    return this.impressora.listarPortas();
  }

  @Post('testar')
  @ApiOperation({ summary: 'Testa a conexão com a impressora (rede ou local)' })
  @ApiBody({ type: ConfigurarImpressoraDto })
  async testar(@Body() dto: ConfigurarImpressoraDto) {
    return this.impressora.testar(dto);
  }

  @Put()
  @ApiOperation({
    summary: 'Salva a impressora (IP ou dispositivo) após validar a conexão',
  })
  @ApiBody({ type: ConfigurarImpressoraDto })
  async salvar(@Body() dto: ConfigurarImpressoraDto) {
    return this.impressora.salvar(dto);
  }
}
