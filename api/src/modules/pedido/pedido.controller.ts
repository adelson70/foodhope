import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PedidoService } from './pedido.service.js';
import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { CriarPedidoDto } from './dto/criar.dto.js';
import { ListarDto } from './dto/listar.dto.js';
import type { AuthUser } from '../../infra/auth/auth.guard.js';

@ApiTags('Pedidos')
@Controller('pedido')
export class PedidoController {
  constructor(private readonly pedido: PedidoService) {}

  @Get()
  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Listagem de Pedidos' })
  async listar(@Query() dto: ListarDto) {
    return this.pedido.listarPedido(dto);
  }

  @Get(':params')
  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Buscar Pedido' })
  async buscar(@Param('params') params: string) {
    return this.pedido.buscarPedido(params);
  }

  @Post()
  @Auth('jwt-or-visitor')
  @ApiOperation({ summary: 'Criação de Pedido' })
  async criar(
    @Body() dto: CriarPedidoDto,
    @Req() req: { user?: AuthUser },
  ) {
    if (!req.user) {
      throw new BadRequestException('Operação não autorizada');
    }
    return this.pedido.criarPedido(dto, req.user);
  }

  @Post(':id/pronto')
  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Marca pedido como pronto (tela de pedidos prontos)' })
  async marcarPronto(@Param('id') id: string) {
    return this.pedido.marcarPedidoPronto(id);
  }

  @Post(':id/pago')
  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Marca pedido como pago' })
  async marcarPago(@Param('id') id: string) {
    return this.pedido.marcarPedidoPago(id);
  }

  @Post(':id/reimprimir')
  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Reimpressão de Pedido' })
  async reimprimir(@Param('id') id: string) {
    return this.pedido.reimprimirPedido(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Deleção de Pedido' })
  async deletar(@Param('id') id: string) {
    return this.pedido.deletarPedido(id);
  }
}
