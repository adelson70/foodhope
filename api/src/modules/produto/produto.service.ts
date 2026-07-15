import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';

import { JwtServiceCustom } from '../../infra/auth/jwt.service.js';
import { CreateDto } from './dto/create.dto.js';

@Injectable()
export class ProdutoService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,

    private readonly jwt: JwtServiceCustom,
  ) {}

  async criarProduto(dto: CreateDto) {
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
          include: { adicionais: {select: {id: true, nome: true, preco: true, produto_id: true}} },
        });
      });
  
      return {dados: produtoCompleto, mensagem: "Produto criado com sucesso"};
  
    }catch (erro) {
      
      console.error('Erro na transação de produto:', erro);
      
      throw new InternalServerErrorException('Não foi possível criar o produto. Tente novamente.');
    }
  }
}
