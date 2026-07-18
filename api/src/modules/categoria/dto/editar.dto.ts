import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class EditarCategoriaDto {
  @ApiPropertyOptional({ example: 'Lanches', description: 'Nome da categoria' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Informe o nome da categoria' })
  nome?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Ordem de exibição na home do lead (0 = primeiro)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A ordem deve ser um número inteiro' })
  @Min(0, { message: 'A ordem não pode ser negativa' })
  ordem?: number;
}
