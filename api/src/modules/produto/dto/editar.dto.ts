import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { AdicionalEditarDto } from './adicional.dto.js';
import { Type } from 'class-transformer';

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
  @IsNumber({ maxDecimalPlaces: 2 })
  preco?: number;

  @ApiProperty({
    description: 'Lista de adicionais (Se enviar, o ID de cada um é obrigatório)',
    type: [AdicionalEditarDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdicionalEditarDto)
  adicionais?: AdicionalEditarDto[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Imagem opcional do produto',
  })
  @IsOptional()
  imagem?: Express.Multer.File;
}
