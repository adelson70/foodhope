import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { ProdutoService } from './produto.service.js';
import { JwtGuard } from '../../infra/auth/jwt.guard.js';
import { CriarDto } from './dto/criar.dto.js';
import { EditarDto } from './dto/editar.dto.js';
import { ListarDto } from './dto/listar.dto.js';
import { produtoImagemUploadOptions } from './produto-upload.config.js';

@ApiTags('Produtos')
@Controller('produto')
export class ProdutoController {
  constructor(private readonly produto: ProdutoService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listagem de Produto' })
  async listar(@Param() dto: ListarDto) {
    return this.produto.listarProduto(dto);
  }

  @Get(':params')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar Produto' })
  async buscar(@Param('params') params: string) {
    return this.produto.buscarProduto(params);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CriarDto })
  @ApiOperation({ summary: 'Criação de Produto' })
  @UseInterceptors(FileInterceptor('imagem', produtoImagemUploadOptions))
  async criar(
    @Body() dto: CriarDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.produto.criarProduto(dto, file);
  }

  @Put(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: EditarDto })
  @ApiOperation({ summary: 'Edição de Produto' })
  @UseInterceptors(FileInterceptor('imagem', produtoImagemUploadOptions))
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (
      !dto.nome &&
      !dto.descricao &&
      dto.preco === undefined &&
      (!dto.adicionais || dto.adicionais.length === 0) &&
      !file
    ) {
      return { mensagem: 'Nada para editar :)' };
    }

    return this.produto.editarProduto(id, dto, file);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deleção de Produto' })
  async deletar(@Param('id') id: string) {
    return this.produto.deletarProduto(id);
  }
}
