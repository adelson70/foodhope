import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AtualizarCozinhaDto {
  @ApiProperty({
    example: true,
    description: 'Quando false, a loja fica fechada para compras (cliente e totem)',
  })
  @IsBoolean({ message: 'Informe se a cozinha está ativa ou não.' })
  ativa: boolean;
}
