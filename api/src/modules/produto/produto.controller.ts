import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
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
import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import { CriarDto } from './dto/criar.dto.js';
import { EditarProdutoDto } from './dto/editar.dto.js';
import { ListarDto } from './dto/listar.dto.js';
import { produtoImagemUploadOptions } from './produto-upload.config.js';

@ApiTags('Produtos')
@Controller('produto')
export class ProdutoController {
  constructor(private readonly produto: ProdutoService) {}

  @Get()
  @Auth('jwt-or-visitor')
  @ApiOperation({ summary: 'Listagem de Produto' })
  async listar(@Query() dto: ListarDto) {
    return this.produto.listarProduto(dto);
  }

  @Get(':params')
  @Auth('jwt-or-visitor')
  @ApiOperation({ summary: 'Buscar Produto' })
  async buscar(@Param('params') params: string) {
    return this.produto.buscarProduto(params);
  }

  @Post()
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
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: EditarProdutoDto })
  @ApiOperation({ summary: 'Edição de Produto' })
  @UseInterceptors(FileInterceptor('imagem', produtoImagemUploadOptions))
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarProdutoDto,
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deleção de Produto' })
  async deletar(@Param('id') id: string) {
    return this.produto.deletarProduto(id);
  }
}
