import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ProdutoService } from './produto.service.js';
import { JwtGuard } from '../../infra/auth/jwt.guard.js';
import { CreateDto } from './dto/create.dto.js';

@ApiTags('Produtos')
@Controller('produto')
export class ProdutoController {
  constructor(private readonly produto: ProdutoService) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criação de Produto' })
  async criar(
    @Body() dto: CreateDto
  ) {
    return this.produto.criarProduto(dto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deleção de Produto' })
  async deletar(
    @Param("id") id: string
  ) {
    return this.produto.deletarProduto(id);
  }


}