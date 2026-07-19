import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { RoleOperador } from '../../../generated/prisma/enums.js';

@Injectable()
export class JwtServiceCustom {
  constructor(private readonly jwt: JwtService) {}

  generate(payload: { id: string; role: RoleOperador }) {
    return this.jwt.sign(payload, { secret: process.env.JWT_SECRET });
  }

  verify(token: string) {
    return this.jwt.verify(token);
  }
}
