import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

function stripHandle({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^\$+/, '');
}

export class ConfigurarInfinitePayDto {
  @ApiProperty({
    example: 'foodhope',
    description: 'InfiniteTag sem o símbolo $',
  })
  @Transform(stripHandle)
  @IsString()
  @IsNotEmpty({ message: 'Informe a InfiniteTag (handle)' })
  handle: string;
}

export class ConfirmarCheckoutDto {
  @ApiProperty({ description: 'order_nsu da sessão de checkout' })
  @IsString()
  @IsNotEmpty()
  order_nsu: string;

  @ApiProperty({ description: 'transaction_nsu retornado pela InfinitePay' })
  @IsString()
  @IsNotEmpty()
  transaction_nsu: string;

  @ApiProperty({ description: 'slug / invoice_slug da fatura' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receipt_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  capture_method?: string;
}
