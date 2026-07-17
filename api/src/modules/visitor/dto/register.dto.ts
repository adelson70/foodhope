import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterVisitorDto {
  @ApiProperty({
    description: 'Chave pública ECDSA P-256 em SPKI base64',
    example: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
  })
  @IsString()
  @MinLength(40)
  @MaxLength(1024)
  publicKey: string;
}
