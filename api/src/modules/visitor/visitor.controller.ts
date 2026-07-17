import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorator/public.decorator.js';
import { ConfirmVisitorDto } from './dto/confirm.dto.js';
import { RegisterVisitorDto } from './dto/register.dto.js';
import { VisitorService } from './visitor.service.js';

@ApiTags('Visitor')
@Controller('visitor')
export class VisitorController {
  constructor(private readonly visitor: VisitorService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registra chave pública do visitor e emite challenge' })
  async register(@Body() dto: RegisterVisitorDto) {
    return this.visitor.register(dto);
  }

  @Post('confirm')
  @Public()
  @ApiOperation({ summary: 'Confirma posse da chave privada assinando o challenge' })
  async confirm(@Body() dto: ConfirmVisitorDto) {
    return this.visitor.confirm(dto);
  }
}
