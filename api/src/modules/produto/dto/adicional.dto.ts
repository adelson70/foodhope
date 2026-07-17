import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class AdicionalDto {
  @ApiProperty({ example: 'ovo', description: 'Nome do adicional' })
  @IsString({ message: 'O nome do adicional deve ser um texto' })
  nome: string;

  @ApiProperty({ example: 2.5, description: 'Valor cobrado pelo adicional' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O valor deve ser numérico com até 2 casas decimais' },
  )
  @Min(0, { message: 'O valor não pode ser negativo' })
  preco: number;

  @ApiProperty({ example: true, description: 'Disponível neste produto', required: false })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AdicionalEditarDto {
  @ApiProperty({ example: '65dadeca...', description: 'ID do adicional', required: false })
  @ValidateIf((o) => o.foiDeletado === true || o.id !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'O ID é obrigatório para deletar ou editar um adicional.' })
  id?: string;

  @ApiProperty({ example: true, description: 'Flag de adicional deletado', required: false })
  @IsBoolean()
  @IsOptional()
  foiDeletado?: boolean;

  @ApiProperty({ example: 'Ovo', description: 'Nome do adicional', required: false })
  @ValidateIf((o) => (!o.foiDeletado && !o.id) || o.nome !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório para novos adicionais.' })
  nome?: string;

  @ApiProperty({ example: 2.5, description: 'Valor', required: false })
  @ValidateIf((o) => (!o.foiDeletado && !o.id) || o.preco !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser numérico.' })
  @Min(0, { message: 'O valor não pode ser negativo.' })
  preco?: number;

  @ApiProperty({ example: true, description: 'Disponível neste produto', required: false })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
