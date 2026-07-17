import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PedidoService } from './pedido.service.js';
import { JwtGuard } from '../../infra/auth/jwt.guard.js';
import { CriarPedidoDto } from './dto/criar.dto.js';
import { ListarDto } from './dto/listar.dto.js';

@ApiTags('Pedidos')
@Controller('pedido')
export class PedidoController {
    constructor(private readonly pedido: PedidoService) { }

    @Get()
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Listagem de Pedidos' })
    async listar(
        @Param() dto: ListarDto
    ) {
        return this.pedido.listarPedido(dto);
    }

    @Get(':params')
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Buscar Pedido' })
    async buscar(
        @Param('params') params: string
    ) {
        return this.pedido.buscarPedido(params);
    }

    @Post()
    //   POR ENQUANTO SERA AUTENTICADA MAS TEM QUE TROCAR PARA SER TB DAQUELA MANEIRA LA PELO USUARIO NAO AUTENTICADO
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Criação de Pedido' })
    async criar(@Body() dto: CriarPedidoDto) {
        return this.pedido.criarPedido(dto);
    }

    @Delete(':id')
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Deleção de Pedido' })
    async deletar(@Param('id') id: string) {
      return this.pedido.deletarPedido(id);
    }
}
