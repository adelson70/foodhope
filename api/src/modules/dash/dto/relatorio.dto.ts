import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

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
}
