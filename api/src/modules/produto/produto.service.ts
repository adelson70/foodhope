import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';

import { JwtServiceCustom } from '../../infra/auth/jwt.service.js';
import { CriarDto } from './dto/criar.dto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { EditarDto } from './dto/editar.dto.js';

@Injectable()
export class ProdutoService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,

    private readonly jwt: JwtServiceCustom,
  ) {}

  async criarProduto(dto: CriarDto) {
    try {
      const temAdicionais = dto.adicionais && dto.adicionais.length > 0;
      
      const produtoCompleto = await this.prismaWrite.$transaction(async (tx) => {
        
        const novoProduto = await tx.produto.create({
          data: {
            nome: dto.nome,
            descricao: dto.descricao,
            preco: dto.preco,
          }
        });
  
        if (temAdicionais && dto.adicionais) {
          const adicionaisMapeados = dto.adicionais.map((adicional) => ({
            nome: adicional.nome,
            preco: adicional.preco, 
            produto_id: novoProduto.id, 
          }));

          await tx.adicionalProduto.createMany({ 
            data: adicionaisMapeados 
          });
        }

        return tx.produto.findUnique({
          where: { id: novoProduto.id },
          omit: {createdAt: true, updatedAt: true},
          include: { adicionais: {select: {id: true, nome: true, preco: true}} },
        });
      });
  
      return {dados: produtoCompleto, mensagem: "Produto criado com sucesso"};
  
    }catch (erro) {
      
      console.error('Erro na transação de produto:', erro);
      
      throw new InternalServerErrorException('Não foi possível criar o produto. Tente novamente.');
    }
  }

  async editarProduto(id: string, dto: EditarDto) {
    try {
      const produtoEditado = await this.prismaWrite.produto.update({where: {id}, data: dto})

      return {mensagem: "Produto editado com sucesso", dados: produtoEditado}
      
    }catch (erro) {
      
      console.error('Erro na transação de produto:', erro);
      
      throw new InternalServerErrorException('Não foi possível criar o produto. Tente novamente.');
    }
  }

  async deletarProduto(id: string) {
    try {
      await this.prismaWrite.produto.delete({where: {id}})
      return {mensagem: "Produto deletado com sucesso"}
    } catch (erro) {
      console.log('erro', erro)
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Produto não encontrado.');
      }
      
      throw new InternalServerErrorException('Não foi possível deletar o produto. Tente novamente.');
    }
  }
}
