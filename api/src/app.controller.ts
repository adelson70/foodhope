import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { Response } from 'express';
import { Public } from './common/decorator/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  redirect(@Res() res: Response) {
    const targetUrl = process.env.APP || 'https://www.google.com';
    
    return res.redirect(targetUrl);
  }
}
