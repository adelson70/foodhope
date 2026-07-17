import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class EditarOperadorDto {
  @ApiProperty({
    description: 'O nome ou login do usuário',
    example: 'operador',
    minLength: 3,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  nome?: string;

  @ApiProperty({
    description: 'A nova senha de acesso do usuário',
    example: 'teste',
    minLength: 4,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'A senha deve ter pelo menos 4 caracteres' })
  senha?: string;
}
