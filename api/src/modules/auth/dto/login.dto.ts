import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'O nome ou login do usuário',
    example: 'operador',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  nome: string;

  @ApiProperty({
    description: 'A senha de acesso do usuário',
    example: 'teste',
    minLength: 4,
  })
  @IsString()
  @MinLength(4, { message: 'A senha deve ter pelo menos 4 caracteres' })
  senha: string;
}
