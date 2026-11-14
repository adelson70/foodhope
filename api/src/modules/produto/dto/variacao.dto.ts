import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export const TIPOS_PRODUTO = ['SIMPLES', 'VARIAVEL'] as const;
export type TipoProdutoDto = (typeof TIPOS_PRODUTO)[number];

export class VariacaoDto {
  @ApiProperty({ example: 'Uva', description: 'Nome da variação' })
  @IsString({ message: 'O nome da variação deve ser um texto' })
  @IsNotEmpty({ message: 'Informe o nome da variação.' })
  nome: string;

  @ApiProperty({ example: 4.5, description: 'Preço da variação' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O preço da variação deve ser numérico com até 2 casas decimais' },
  )
  @Min(0, { message: 'O preço da variação não pode ser negativo' })
  @Max(99999999.99, { message: 'O preço da variação excede o limite permitido' })
  preco: number;

  @ApiProperty({ example: true, description: 'Variação disponível', required: false })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class VariacaoEditarDto {
  @ApiProperty({ description: 'ID da variação', required: false })
  @ValidateIf((o: VariacaoEditarDto) => o.foiDeletado === true || o.id !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'O ID é obrigatório para deletar ou editar uma variação.' })
  id?: string;

  @ApiProperty({ example: true, description: 'Flag de variação deletada', required: false })
  @IsBoolean()
  @IsOptional()
  foiDeletado?: boolean;

  @ApiProperty({ example: 'Uva', description: 'Nome da variação', required: false })
  @ValidateIf((o: VariacaoEditarDto) => (!o.foiDeletado && !o.id) || o.nome !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório para novas variações.' })
  nome?: string;

  @ApiProperty({ example: 4.5, description: 'Preço da variação', required: false })
  @ValidateIf((o: VariacaoEditarDto) => (!o.foiDeletado && !o.id) || o.preco !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço da variação deve ser numérico.' })
  @Min(0, { message: 'O preço da variação não pode ser negativo.' })
  @Max(99999999.99, { message: 'O preço da variação excede o limite permitido' })
  preco?: number;

  @ApiProperty({ example: true, description: 'Variação disponível', required: false })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
