import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdicionalEditarDto } from './adicional.dto.js';

export class EditarProdutoDto {
  @ApiProperty({ example: 'X Salada', description: 'Nome do produto', required: false })
  @IsOptional()
  nome?: string;

  @ApiProperty({
    example: 'pão, tomate, cebola, carne, milho, maionese',
    description: 'Descrição do produto',
    required: false,
  })
  @IsOptional()
  descricao?: string;

  @ApiProperty({ example: 150.55, description: 'Preço do produto', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  preco?: number;

  @ApiProperty({
    description:
      'Lista de alterações de adicionais (criar sem id, editar/deletar com id)',
    type: [AdicionalEditarDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdicionalEditarDto)
  adicionais?: AdicionalEditarDto[];
}
