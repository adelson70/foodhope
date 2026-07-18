import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
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

  @ApiPropertyOptional({
    description: 'Se o produto está disponível no cardápio',
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Se o produto deve ser impresso em cupom separado',
  })
  @IsOptional()
  @IsBoolean()
  imprimirSeparado?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Ordem dentro da categoria (0 = primeiro do grupo)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A ordem deve ser um número inteiro' })
  @Min(0, { message: 'A ordem não pode ser negativa' })
  ordem?: number;

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

  @ApiPropertyOptional({
    description: 'IDs dos adicionais globais vinculados a este produto (substitui o conjunto)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada adicional global deve ser um UUID válido' })
  adicionalGlobalIds?: string[];

  @ApiPropertyOptional({
    description: 'ID da categoria (null remove a categoria)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4', { message: 'Categoria inválida' })
  categoriaId?: string | null;
}
