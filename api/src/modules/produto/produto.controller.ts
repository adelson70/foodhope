import {
  BadRequestException,
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
  @ApiOperation({ summary: 'Criação de Produto (JSON)' })
  async criar(@Body() dto: CriarDto) {
    return this.produto.criarProduto(dto);
  }

  @Put(':id/imagem')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['imagem'],
      properties: {
        imagem: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload/substituição da imagem do produto' })
  @UseInterceptors(FileInterceptor('imagem', produtoImagemUploadOptions))
  async editarImagem(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Envie uma imagem no campo "imagem".');
    }
    return this.produto.editarImagemProduto(id, file);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiBody({ type: EditarProdutoDto })
  @ApiOperation({ summary: 'Edição de Produto (JSON)' })
  async editar(@Param('id') id: string, @Body() dto: EditarProdutoDto) {
    if (
      !dto.nome &&
      !dto.descricao &&
      dto.preco === undefined &&
      (!dto.adicionais || dto.adicionais.length === 0) &&
      dto.adicionalGlobalIds === undefined
    ) {
      return { mensagem: 'Nada para editar :)' };
    }

    return this.produto.editarProduto(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deleção de Produto' })
  async deletar(@Param('id') id: string) {
    return this.produto.deletarProduto(id);
  }
}
