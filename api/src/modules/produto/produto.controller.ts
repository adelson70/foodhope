import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ProdutoService } from './produto.service.js';
import { JwtGuard } from '../../infra/auth/jwt.guard.js';
import { CriarDto } from './dto/criar.dto.js';
import { EditarDto } from './dto/editar.dto.js';

@ApiTags('Produtos')
@Controller('produto')
export class ProdutoController {
  constructor(private readonly produto: ProdutoService) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criação de Produto' })
  async criar(
    @Body() dto: CriarDto
  ) {
    return this.produto.criarProduto(dto);
  }

  @Put(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edição de Produto' })
  async editar(
    @Param("id") id: string,
    @Body() dto: EditarDto
  ) {
    if (!dto.nome && !dto.descricao && !dto.preco) return {mensagem: "Nada para editar :)"}
    return this.produto.editarProduto(id, dto);
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