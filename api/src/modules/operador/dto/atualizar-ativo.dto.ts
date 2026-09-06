import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AtualizarAtivoDto {
  @ApiProperty({ example: false, description: 'Se o login do usuário está ativo' })
  @IsBoolean()
  ativo: boolean;
}
