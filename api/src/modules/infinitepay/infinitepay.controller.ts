import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { Auth } from '../../common/decorator/auth-mode.decorator.js';
import { Public } from '../../common/decorator/public.decorator.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { SkipTransform } from '../../common/decorator/skip-transform.decorator.js';
import type { AuthUser } from '../../infra/auth/auth.guard.js';
import { CriarPedidoDto } from '../pedido/dto/criar.dto.js';
import {
  ConfigurarInfinitePayDto,
  ConfirmarCheckoutDto,
} from './dto/infinitepay.dto.js';
import { InfinitePayService } from './infinitepay.service.js';

@ApiTags('InfinitePay')
@Controller()
export class InfinitePayController {
  constructor(private readonly infinitepay: InfinitePayService) {}

  @Get('infinitepay')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retorna a configuração da InfinitePay' })
  async obter() {
    return this.infinitepay.obter();
  }

  @Put('infinitepay')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Salva a InfiniteTag (handle) da InfinitePay' })
  @ApiBody({ type: ConfigurarInfinitePayDto })
  async salvar(@Body() dto: ConfigurarInfinitePayDto) {
    return this.infinitepay.salvar(dto);
  }

  @Post('checkout')
  @Auth('jwt-or-visitor')
  @ApiOperation({
    summary: 'Gera link de checkout InfinitePay (somente visitor)',
  })
  async checkout(
    @Body() dto: CriarPedidoDto,
    @Req() req: { user?: AuthUser },
  ) {
    if (!req.user || req.user.tipo !== 'visitor') {
      throw new BadRequestException(
        'Checkout online disponível apenas para o cliente.',
      );
    }
    return this.infinitepay.iniciarCheckout(dto);
  }

  @Post('checkout/confirmar')
  @Auth('jwt-or-visitor')
  @ApiOperation({
    summary: 'Confirma pagamento via payment_check e cria o pedido',
  })
  async confirmar(
    @Body() dto: ConfirmarCheckoutDto,
    @Req() req: { user?: AuthUser },
  ) {
    if (!req.user || req.user.tipo !== 'visitor') {
      throw new BadRequestException(
        'Confirmação de checkout disponível apenas para o cliente.',
      );
    }
    return this.infinitepay.confirmarCheckout(dto);
  }

  @Post('webhook/infinitepay')
  @Public()
  @SkipTransform()
  @ApiOperation({ summary: 'Webhook de pagamento aprovado da InfinitePay' })
  async webhook(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: false }) res: Response,
  ) {
    const result = await this.infinitepay.processarWebhook(body);
    return res.status(result.status).json({
      success: result.ok,
      message: result.message,
    });
  }
}
