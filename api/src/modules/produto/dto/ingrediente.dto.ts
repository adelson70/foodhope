import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class IngredienteDto {
  @ApiProperty({ example: 'Cebola', description: 'Nome do ingrediente (retirável)' })
  @IsString({ message: 'O nome do ingrediente deve ser um texto' })
  @MinLength(1, { message: 'Informe o nome do ingrediente' })
  nome: string;
}

export class IngredienteEditarDto {
  @ApiProperty({ example: '65dadeca...', description: 'ID do ingrediente', required: false })
  @ValidateIf((o) => o.foiDeletado === true || o.id !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'O ID é obrigatório para deletar ou editar um ingrediente.' })
  id?: string;

  @ApiProperty({ example: true, description: 'Flag de ingrediente deletado', required: false })
  @IsBoolean()
  @IsOptional()
  foiDeletado?: boolean;

  @ApiProperty({ example: 'Cebola', description: 'Nome do ingrediente', required: false })
  @ValidateIf((o) => (!o.foiDeletado && !o.id) || o.nome !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório para novos ingredientes.' })
  nome?: string;
}
