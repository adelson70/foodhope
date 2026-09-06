import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { VisualizacaoTelaPedidos } from '../../../../generated/prisma/enums.js';

export class AtualizarVisualizacaoTelaPedidosDto {
  @ApiProperty({
    enum: VisualizacaoTelaPedidos,
    example: VisualizacaoTelaPedidos.DIA,
    description: 'DIA = só pedidos prontos de hoje (SP); TUDO = todos os prontos',
  })
  @IsEnum(VisualizacaoTelaPedidos, {
    message: 'Visualização inválida. Use DIA ou TUDO.',
  })
  visualizacao: VisualizacaoTelaPedidos;
}
