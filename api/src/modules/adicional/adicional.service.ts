import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { CriarAdicionalDto } from './dto/criar.dto.js';
import { EditarAdicionalDto } from './dto/editar.dto.js';

@Injectable()
export class AdicionalService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async listar() {
    try {
      const adicionais = await this.prismaRead.adicionalGlobal.findMany({
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      });

      return { dados: { adicionais } };
    } catch (erro) {
      console.error('Erro ao listar adicionais globais:', erro);
      throw new InternalServerErrorException(
        'Não foi possível listar os adicionais. Tente novamente.',
      );
    }
  }

  async criar(dto: CriarAdicionalDto) {
    try {
      const adicional = await this.prismaWrite.adicionalGlobal.create({
        data: {
          nome: dto.nome.trim(),
          preco: dto.preco,
          ativo: true,
        },
      });

      return { mensagem: 'Adicional criado com sucesso', dados: adicional };
    } catch (erro) {
      console.error('Erro ao criar adicional global:', erro);
      throw new InternalServerErrorException(
        'Não foi possível criar o adicional. Tente novamente.',
      );
    }
  }

  async editar(id: string, dto: EditarAdicionalDto) {
    try {
      const data: { nome?: string; preco?: number; ativo?: boolean } = {};

      if (dto.nome !== undefined) data.nome = dto.nome.trim();
      if (dto.preco !== undefined) data.preco = dto.preco;
      if (dto.ativo !== undefined) data.ativo = dto.ativo;

      const adicional = await this.prismaWrite.adicionalGlobal.update({
        where: { id },
        data,
      });

      return { mensagem: 'Adicional editado com sucesso', dados: adicional };
    } catch (erro) {
      console.error('Erro ao editar adicional global:', erro);

      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Adicional não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível editar o adicional. Tente novamente.',
      );
    }
  }

  async deletar(id: string) {
    try {
      await this.prismaWrite.adicionalGlobal.delete({ where: { id } });
      return { mensagem: 'Adicional excluído com sucesso' };
    } catch (erro) {
      console.error('Erro ao deletar adicional global:', erro);

      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
        throw new NotFoundException('Adicional não encontrado.');
      }

      throw new InternalServerErrorException(
        'Não foi possível excluir o adicional. Tente novamente.',
      );
    }
  }
}
