import { Module } from '@nestjs/common';

import { VisitorController } from './visitor.controller.js';
import { VisitorService } from './visitor.service.js';

@Module({
  controllers: [VisitorController],
  providers: [VisitorService],
  exports: [VisitorService],
})
export class VisitorModule {}
