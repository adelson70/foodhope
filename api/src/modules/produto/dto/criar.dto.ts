import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  MinLength,
  Max,
  Min,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsUUID,
} from 'class-validator';
import { IsObrigatorio } from '../../../common/decorator/is-obrigatorio.decorator.js';
import { AdicionalDto } from './adicional.dto.js';

export class CriarDto {
  @ApiProperty({
    description: 'Nome do Produto',
    example: 'X Burguer',
  })
  @IsString()
  @MinLength(5, { message: 'Nome do produto deve ser no minimo de 5 letras' })
  @IsObrigatorio({ message: 'Você esqueceu de escolher o nome do produto' })
  nome: string;

  @ApiProperty({
    description: 'Descrição do Produto',
    example: '2 hamburguers no meio do pão',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  descricao?: string;

  @ApiProperty({ example: 150.55, description: 'Preço do produto (Máximo 10,2)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ter no máximo 2 casas decimais' })
  @Max(99999999.99, { message: 'O valor excede o limite permitido' })
  @Min(0)
  @IsObrigatorio({ message: 'Ei, você esqueceu de colocar o preço do lanche!' })
  preco: number;

  @ApiPropertyOptional({
    description: 'Se o produto está disponível no cardápio',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Lista de adicionais específicos do lanche',
    type: [AdicionalDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdicionalDto)
  adicionais?: AdicionalDto[];

  @ApiPropertyOptional({
    description: 'IDs dos adicionais globais vinculados a este produto',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada adicional global deve ser um UUID válido' })
  adicionalGlobalIds?: string[];
}
