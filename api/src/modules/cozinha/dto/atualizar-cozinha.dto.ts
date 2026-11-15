import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AtualizarCozinhaDto {
  @ApiProperty({
    example: true,
    description: 'Quando false, a loja fica fechada para compras (cliente e totem)',
  })
  @IsBoolean({ message: 'Informe se a cozinha está ativa ou não.' })
  ativa: boolean;

  @ApiPropertyOptional({
    example: 150,
    description: 'Ao abrir: dinheiro no caixa (fundo de troco). Registra a abertura do caixa.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor do caixa deve ser numérico.' })
  @Min(0, { message: 'O valor do caixa não pode ser negativo.' })
  @Max(99999999.99, { message: 'O valor do caixa excede o limite permitido.' })
  fundo_troco?: number;

  @ApiPropertyOptional({
    example: 'Notas de 2 e 5, moedas de 1',
    description: 'Observação da abertura',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'A observação pode ter até 300 caracteres.' })
  observacao?: string;
}
