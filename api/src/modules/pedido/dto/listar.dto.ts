import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class ListarDto {
  @ApiPropertyOptional({
    description: 'Cursor para a próxima página (Recebido no retorno da requisição anterior)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    example: '2026-07-19',
    description: 'Filtra os pedidos de um dia específico (fuso America/Sao_Paulo), formato YYYY-MM-DD',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data deve estar no formato YYYY-MM-DD.',
  })
  data?: string;

  @ApiPropertyOptional({
    description:
      'true = só pedidos prontos (tela); false = só em preparo; omitido = todos',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  pronto?: boolean;

  @ApiPropertyOptional({ example: 10, description: 'Quantidade de itens por página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
