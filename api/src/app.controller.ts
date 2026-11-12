import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { Response } from 'express';
import { Public } from './common/decorator/public.decorator.js';
import { HEADER_INSTANCIA, INSTANCIA_API } from './modules/impressora/descoberta-rede.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  redirect(@Res() res: Response) {
    const targetUrl = process.env.APP || 'https://www.google.com';

    return res.redirect(targetUrl);
  }

  @Get('health')
  @Public()
  health(@Res({ passthrough: true }) res: Response) {
    res.setHeader(HEADER_INSTANCIA, INSTANCIA_API);
    return { status: 'ok' };
  }
}
