import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtGuard } from '../../infra/auth/jwt.guard.js';
import { DashService } from './dash.service.js';

@ApiTags('Dash')
@Controller('dash')
export class DashController {
  constructor(private readonly dash: DashService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resumo do dashboard do operador' })
  async obter() {
    return this.dash.obterResumo();
  }
}
