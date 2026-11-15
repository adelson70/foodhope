import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import type { AuthUser } from '../auth/auth.guard.js';
import { RegistrarDispositivoDto } from './push.dto.js';
import { PushService } from './push.service.js';

@ApiTags('Push')
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('dispositivo')
  @Auth('jwt-or-visitor')
  @ApiOperation({ summary: 'Registra o aparelho do cliente para o aviso de pedido pronto' })
  async registrar(@Body() dto: RegistrarDispositivoDto, @Req() req: { user?: AuthUser }) {
    if (req.user?.tipo !== 'visitor') {
      throw new BadRequestException('Disponível apenas para o cliente.');
    }
    await this.push.registrarDispositivo(req.user.id, dto.token);
    return { mensagem: 'Aparelho registrado' };
  }
}
