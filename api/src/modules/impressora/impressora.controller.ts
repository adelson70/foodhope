import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ConfigurarImpressoraDto, DefinirIpPonteDto } from './dto/configurar.dto.js';
import { ImpressoraService } from './impressora.service.js';
import { PonteService } from './ponte.service.js';
import { FilaImpressaoStatusService } from './fila-impressao-status.service.js';
import { Roles } from '../../common/decorator/roles.decorator.js';

@ApiTags('Impressora')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('impressora')
export class ImpressoraController {
  constructor(
    private readonly impressora: ImpressoraService,
    private readonly ponte: PonteService,
    private readonly filaStatus: FilaImpressaoStatusService,
  ) {}

  @Get('fila')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Cupons esperando na fila, estado da ponte e pedidos não impressos' })
  async fila() {
    return { dados: await this.filaStatus.resumo() };
  }

  @Get('ponte')
  @ApiOperation({ summary: 'Estado da ponte ESP32 (conexão, autorização e impressora encontrada)' })
  async estadoPonte() {
    return { dados: await this.ponte.sondar(1500) };
  }

  @Put('ponte/ip')
  @ApiOperation({ summary: 'Fixa o IP da impressora no ESP32 (vazio = redescobrir na rede)' })
  @ApiBody({ type: DefinirIpPonteDto })
  async definirIpPonte(@Body() dto: DefinirIpPonteDto) {
    return {
      mensagem: dto.ip ? 'IP enviado para o ESP32' : 'ESP32 procurando a impressora na rede',
      dados: await this.ponte.definirIp(dto.ip?.trim() || null),
    };
  }

  @Post('ponte/aceitar')
  @ApiOperation({ summary: 'Autoriza o ESP32 conectado (troca de dispositivo)' })
  async aceitarPonte() {
    return { mensagem: 'ESP32 autorizado', dados: await this.ponte.aceitarDispositivo() };
  }

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

  @Get('descobrir')
  @ApiOperation({
    summary: 'Procura impressoras de rede (porta 9100) nas redes locais',
  })
  @ApiQuery({
    name: 'rede',
    required: false,
    description: 'Rede a varrer (CIDR até /22 ou um IP, que vira o /24 dele)',
    example: '192.168.1.0/24',
  })
  async descobrir(@Query('rede') rede?: string) {
    return this.impressora.descobrirNaRede(rede);
  }

  @Post('testar')
  @ApiOperation({ summary: 'Testa a conexão com a impressora (rede ou local)' })
  @ApiBody({ type: ConfigurarImpressoraDto })
  async testar(@Body() dto: ConfigurarImpressoraDto) {
    return this.impressora.testar(dto);
  }

  @Post('imprimir-teste')
  @ApiOperation({ summary: 'Imprime uma página de teste na impressora informada' })
  @ApiBody({ type: ConfigurarImpressoraDto })
  async imprimirTeste(@Body() dto: ConfigurarImpressoraDto) {
    return this.impressora.imprimirTeste(dto);
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
