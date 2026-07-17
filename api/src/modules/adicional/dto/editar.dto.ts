import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class EditarAdicionalDto {
  @ApiPropertyOptional({ example: 'Ovo', description: 'Nome do adicional global' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome do adicional' })
  nome?: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Preço do adicional global' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ter no máximo 2 casas decimais' })
  @Max(99999999.99, { message: 'O valor excede o limite permitido' })
  @Min(0, { message: 'O valor não pode ser negativo' })
  preco?: number;

  @ApiPropertyOptional({ example: true, description: 'Disponível na cozinha' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
