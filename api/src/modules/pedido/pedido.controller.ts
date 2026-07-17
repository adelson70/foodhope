import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PedidoService } from './pedido.service.js';
import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import { CriarPedidoDto } from './dto/criar.dto.js';
import { ListarDto } from './dto/listar.dto.js';

@ApiTags('Pedidos')
@Controller('pedido')
export class PedidoController {
    constructor(private readonly pedido: PedidoService) { }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Listagem de Pedidos' })
    async listar(
        @Query() dto: ListarDto
    ) {
        return this.pedido.listarPedido(dto);
    }

    @Get(':params')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Buscar Pedido' })
    async buscar(
        @Param('params') params: string
    ) {
        return this.pedido.buscarPedido(params);
    }

    @Post()
    @Auth('jwt-or-visitor')
    @ApiOperation({ summary: 'Criação de Pedido' })
    async criar(@Body() dto: CriarPedidoDto) {
        return this.pedido.criarPedido(dto);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Deleção de Pedido' })
    async deletar(@Param('id') id: string) {
      return this.pedido.deletarPedido(id);
    }
}
