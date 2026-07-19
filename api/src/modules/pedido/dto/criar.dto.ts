import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNotEmpty,
  Matches,
  ValidateIf,
  IsIn,
} from 'class-validator';

export type TipoConsumoDto = 'LEVAR' | 'COMER_AQUI';

function emptyToUndefined({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class ClientePedido {
  @ApiProperty({ example: 'Adelson', description: 'Nome do cliente' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  primeiro_nome: string;

  @ApiPropertyOptional({ example: 'Bittencourt Jr', description: 'Sobrenome do cliente' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  sobrenome?: string;

  @ApiPropertyOptional({
    example: '5548991802334',
    description: 'Contato do cliente (DDI + DDD + Número)',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsString()
  @Matches(/^\d{11,15}$/, {
    message:
      'O contato deve conter apenas números e incluir o Código do País + DDD + Número (Ex: 5548991802334)',
  })
  contato?: string;

  @ApiPropertyOptional({ example: 'Florianópolis', description: 'Cidade do cliente' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  cidade?: string;
}

export class AdicionalPedidoDto {
  @ApiProperty({ example: '9bf4fbef-c255-43be-a58b-3d9ba88628df', description: 'ID do adicional' })
  @IsString({ message: 'O ID do adicional deve ser um texto (UUID)' })
  @IsNotEmpty({ message: 'O ID do adicional é obrigatório' })
  id: string;

  @ApiProperty({ example: 2, description: 'Quantidade do adicional' })
  @IsNumber({}, { message: 'A quantidade deve ser um número' })
  @Min(1, { message: 'A quantidade mínima é 1' })
  qtd: number;
}

export class ItemPedidoDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'ID do produto' })
  @IsString({ message: 'O ID do produto deve ser um texto (UUID)' })
  @IsNotEmpty({ message: 'O ID do produto é obrigatório' })
  id: string;

  @ApiProperty({ example: 1, description: 'Quantidade do produto' })
  @IsNumber({}, { message: 'A quantidade deve ser um número' })
  @Min(1, { message: 'A quantidade mínima é 1' })
  qtd: number;

  @ApiPropertyOptional({
    description: 'Lista de adicionais escolhidos para o lanche',
    type: [AdicionalPedidoDto],
  })
  @IsOptional()
  @IsArray({ message: 'Os adicionais devem ser enviados em formato de lista (array)' })
  @ValidateNested({ each: true })
  @Type(() => AdicionalPedidoDto)
  adicional?: AdicionalPedidoDto[];

  @ApiProperty({ example: 'Retirar carne', description: 'Observação do item do pedido' })
  @IsString()
  @IsOptional()
  observacao: string;

}

export class CriarPedidoDto {
  @ApiProperty({ type: [ItemPedidoDto], description: 'Lista de itens do pedido' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens: ItemPedidoDto[];

  @ApiProperty({ description: 'Informações do cliente', type: ClientePedido })
  @IsNotEmpty({ message: 'Dados do cliente são obrigatórios' })
  @ValidateNested()
  @Type(() => ClientePedido)
  cliente: ClientePedido;

  @ApiPropertyOptional({
    enum: ['LEVAR', 'COMER_AQUI'],
    default: 'COMER_AQUI',
    description: 'Se o pedido é para levar ou para comer no local',
  })
  @IsOptional()
  @IsIn(['LEVAR', 'COMER_AQUI'], {
    message: 'O tipo de consumo deve ser LEVAR ou COMER_AQUI',
  })
  tipo_consumo?: TipoConsumoDto;
}
