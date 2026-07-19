import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { OperadorService } from './operador.service.js';
import { CriarOperadorDto } from './dto/criar.dto.js';
import { EditarOperadorAdminDto } from './dto/editar.dto.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import type { AuthUser } from '../../infra/auth/auth.guard.js';

@ApiTags('Operadores')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('operador')
export class OperadorController {
  constructor(private readonly operador: OperadorService) {}

  @Get()
  @ApiOperation({ summary: 'Lista operadores, admins e totens' })
  async listar() {
    return this.operador.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Cria um usuário (admin, operador ou totem)' })
  @ApiBody({ type: CriarOperadorDto })
  async criar(@Body() dto: CriarOperadorDto) {
    return this.operador.criar(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita um usuário (nome, senha e/ou nível)' })
  @ApiBody({ type: EditarOperadorAdminDto })
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarOperadorAdminDto,
  ) {
    if (
      dto.nome === undefined &&
      dto.senha === undefined &&
      dto.role === undefined
    ) {
      return { mensagem: 'Nada para editar :)' };
    }

    return this.operador.editar(id, dto);
  }

  @Post(':id/logout')
  @ApiOperation({ summary: 'Força o logout de um usuário (via socket)' })
  async forcarLogout(@Param('id') id: string) {
    return this.operador.forcarLogout(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui um usuário' })
  async deletar(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.operador.deletar(id, req.user.id);
  }
}
