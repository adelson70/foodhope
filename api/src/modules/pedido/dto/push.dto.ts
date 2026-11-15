import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InscreverPushDto {
  @ApiProperty({ description: 'Token FCM do aparelho' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;
}
