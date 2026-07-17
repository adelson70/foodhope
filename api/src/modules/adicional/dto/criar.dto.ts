import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';
import { IsObrigatorio } from '../../../common/decorator/is-obrigatorio.decorator.js';

export class CriarAdicionalDto {
  @ApiProperty({ example: 'Ovo', description: 'Nome do adicional global' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome do adicional' })
  @IsObrigatorio({ message: 'Informe o nome do adicional' })
  nome: string;

  @ApiProperty({ example: 2.5, description: 'Preço do adicional global' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ter no máximo 2 casas decimais' })
  @Max(99999999.99, { message: 'O valor excede o limite permitido' })
  @Min(0, { message: 'O valor não pode ser negativo' })
  @IsObrigatorio({ message: 'Informe o preço do adicional' })
  preco: number;
}
