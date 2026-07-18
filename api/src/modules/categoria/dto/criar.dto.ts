import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { IsObrigatorio } from '../../../common/decorator/is-obrigatorio.decorator.js';

export class CriarCategoriaDto {
  @ApiProperty({ example: 'Lanches', description: 'Nome da categoria' })
  @IsString()
  @MinLength(1, { message: 'Informe o nome da categoria' })
  @IsObrigatorio({ message: 'Informe o nome da categoria' })
  nome: string;
}
