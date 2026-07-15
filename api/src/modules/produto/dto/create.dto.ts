import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, MinLength, Max, Min, IsNumber, IsObject, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { IsObrigatorio } from '../../../common/decorator/is-obrigatorio.decorator.js';

export class AdicionalDto {
  @ApiProperty({ example: 'ovo', description: 'Nome do adicional' })
  @IsString({ message: 'O nome do adicional deve ser um texto' })
  nome: string;

  @ApiProperty({ example: 2.50, description: 'Valor cobrado pelo adicional' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser numérico com até 2 casas decimais' })
  @Min(0, { message: 'O valor não pode ser negativo' })
  preco: number;
}

export class CreateDto {
  @ApiProperty({
    description: 'Nome do Produto',
    example: 'X Burguer',
  })
  @IsString()
  @MinLength(5, {message: "Nome do produto deve ser no minimo de 5 letras"})
  @IsObrigatorio({ message: "Você esqueceu de escolher o nome do produto"})
  nome: string;

  @ApiProperty({
    description: 'Descrição do Produto',
    example: '2 hamburguers no meio do pão',
  })
  @IsString()
  @Optional()
  @MinLength(10)
  descricao: string;

  @ApiProperty({ example: 150.55, description: 'Preço do produto (Máximo 10,2)' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ter no máximo 2 casas decimais' })
  @Max(99999999.99, { message: 'O valor excede o limite permitido' })
  @Min(0)
  @IsObrigatorio({ message: 'Ei, você esqueceu de colocar o preço do lanche!' })
  preco: number;

  @ApiPropertyOptional({
    description: 'Lista de adicionais escolhidos para o lanche',
    type: [AdicionalDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) 
  @Type(() => AdicionalDto)
  adicionais?: AdicionalDto[];
}