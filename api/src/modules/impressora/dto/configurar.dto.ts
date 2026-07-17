import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ConfigurarImpressoraDto {
  @ApiProperty({
    description: 'IP ou host:porta da impressora térmica (ESC/POS TCP)',
    example: '192.168.1.50:9100',
  })
  @IsString()
  @MinLength(3)
  @Matches(/^[^\s]+$/, {
    message: 'Informe um IP ou host:porta válido, sem espaços',
  })
  ip: string;
}
