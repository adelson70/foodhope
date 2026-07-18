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
import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import { CategoriaService } from './categoria.service.js';
import { CriarCategoriaDto } from './dto/criar.dto.js';
import { EditarCategoriaDto } from './dto/editar.dto.js';

@ApiTags('Categorias')
@ApiBearerAuth()
@Auth('jwt')
@Controller('categoria')
export class CategoriaController {
  constructor(private readonly categoria: CategoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista categorias ordenadas' })
  async listar() {
    return this.categoria.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Cria categoria' })
  @ApiBody({ type: CriarCategoriaDto })
  async criar(@Body() dto: CriarCategoriaDto) {
    return this.categoria.criar(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita categoria (nome e/ou ordem)' })
  @ApiBody({ type: EditarCategoriaDto })
  async editar(@Param('id') id: string, @Body() dto: EditarCategoriaDto) {
    if (dto.nome === undefined && dto.ordem === undefined) {
      return { mensagem: 'Nada para editar :)' };
    }

    return this.categoria.editar(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui categoria (produtos ficam sem categoria)' })
  async deletar(@Param('id') id: string) {
    return this.categoria.deletar(id);
  }
}
