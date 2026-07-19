import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';

import { RoleOperador } from '../../../../generated/prisma/enums.js';
import { IsObrigatorio } from '../../../common/decorator/is-obrigatorio.decorator.js';

export class CriarOperadorDto {
  @ApiProperty({ example: 'joao', description: 'Nome ou login do usuário' })
  @IsString()
  @MinLength(3, { message: 'O nome deve ter pelo menos 3 caracteres' })
  @IsObrigatorio({ message: 'Informe o nome do usuário' })
  nome: string;

  @ApiProperty({ example: 'senha1234', description: 'Senha de acesso' })
  @IsString()
  @MinLength(4, { message: 'A senha deve ter pelo menos 4 caracteres' })
  @IsObrigatorio({ message: 'Informe a senha do usuário' })
  senha: string;

  @ApiProperty({
    enum: RoleOperador,
    example: RoleOperador.OPERADOR,
    description: 'Nível de acesso do usuário',
  })
  @IsEnum(RoleOperador, { message: 'Nível de acesso inválido' })
  role: RoleOperador;
}
