import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class ConfirmVisitorDto {
  @ApiProperty({ description: 'ID do visitor retornado no register' })
  @IsUUID()
  visitorId: string;

  @ApiProperty({
    description: 'Assinatura ECDSA P-256 (ieee-p1363) do challenge em base64',
  })
  @IsString()
  @MinLength(40)
  @MaxLength(512)
  signature: string;
}
