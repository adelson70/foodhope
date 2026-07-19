import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export type TipoRelatorioDto = 'resumido' | 'completo';

export class RelatorioDto {
  @ApiPropertyOptional({
    enum: ['resumido', 'completo'],
    default: 'resumido',
    description: 'Tipo do relatório a imprimir',
  })
  @IsOptional()
  @IsIn(['resumido', 'completo'], {
    message: 'O tipo do relatório deve ser resumido ou completo',
  })
  tipo?: TipoRelatorioDto;

  @ApiPropertyOptional({
    example: '2026-07-18',
    description: 'Data do relatório (YYYY-MM-DD, fuso America/Sao_Paulo). Padrão: hoje.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data deve estar no formato YYYY-MM-DD',
  })
  data?: string;
}
