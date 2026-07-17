import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdicionalService } from './adicional.service.js';
import { CriarAdicionalDto } from './dto/criar.dto.js';
import { EditarAdicionalDto } from './dto/editar.dto.js';

@ApiTags('Adicionais')
@ApiBearerAuth()
@Controller('adicional')
export class AdicionalController {
  constructor(private readonly adicional: AdicionalService) {}

  @Get()
  @ApiOperation({ summary: 'Lista adicionais globais (ativos e inativos)' })
  async listar() {
    return this.adicional.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Cria adicional global' })
  @ApiBody({ type: CriarAdicionalDto })
  async criar(@Body() dto: CriarAdicionalDto) {
    return this.adicional.criar(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita adicional global' })
  @ApiBody({ type: EditarAdicionalDto })
  async editar(@Param('id') id: string, @Body() dto: EditarAdicionalDto) {
    if (dto.nome === undefined && dto.preco === undefined && dto.ativo === undefined) {
      return { mensagem: 'Nada para editar :)' };
    }

    return this.adicional.editar(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui adicional global' })
  async deletar(@Param('id') id: string) {
    return this.adicional.deletar(id);
  }
}
