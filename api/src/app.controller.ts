import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { Response } from 'express'; 

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  redirect(@Res() res: Response) {
    const targetUrl = process.env.APP || 'https://www.google.com';
    
    return res.redirect(targetUrl);
  }
}