import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ConfigurarImpressoraDto {
  @ApiPropertyOptional({
    description: 'IP ou host:porta da impressora térmica (ESC/POS TCP)',
    example: '192.168.1.50:9100',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[^\s]+$/, {
    message: 'Informe um IP ou host:porta válido, sem espaços',
  })
  ip?: string;

  @ApiPropertyOptional({
    description: 'Dispositivo local da impressora (USB/serial)',
    example: '/dev/serial/by-id/usb-Bematech_MP-4200_TH_Miniprinter-if00',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^(?:\/dev\/(?:usb\/)?lp\d+|\/dev\/tty(?:USB|ACM)\d+|\/dev\/serial\/by-id\/[A-Za-z0-9._+-]+|COM\d+)$/i,
    {
      message:
        'Informe um dispositivo válido (/dev/ttyACM0, /dev/serial/by-id/…, COM1, …)',
    },
  )
  dispositivo?: string;
}
