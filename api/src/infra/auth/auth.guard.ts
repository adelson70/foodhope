import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import {
  AUTH_MODE_KEY,
  type AuthMode,
} from '../../common/decorator/auth-mode.decorator.js';
import { IS_PUBLIC_KEY } from '../../common/decorator/public.decorator.js';
import { PrismaReadService } from '../database/prisma-read.service.js';
import { RedisService } from '../cache/redis.service.js';
import {
  buildRequestCanonical,
  isTimestampFresh,
  parseSpkiPublicKey,
  sha256Hex,
  verifyEcdsaP256Sha256,
  VISITOR_REPLAY_TTL_SECONDS,
} from './visitor-crypto.js';

export type AuthUser =
  | { tipo: 'operador'; id: string }
  | { tipo: 'visitor'; id: string };

type RequestWithAuth = Request & {
  user?: AuthUser;
  rawBody?: Buffer;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prismaRead: PrismaReadService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const mode =
      this.reflector.getAllAndOverride<AuthMode>(AUTH_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'jwt';

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const bearer = this.extractBearer(req);

    if (bearer) {
      try {
        const payload = await this.jwt.verifyAsync<{ id: string }>(bearer, {
          secret: process.env.JWT_SECRET,
        });

        if (!payload?.id) {
          throw new UnauthorizedException('Operação não autorizada');
        }

        req.user = { tipo: 'operador', id: payload.id };
        return true;
      } catch {
        if (mode === 'jwt') {
          throw new UnauthorizedException('Operação não autorizada');
        }
      }
    } else if (mode === 'jwt') {
      throw new UnauthorizedException('Operação não autorizada');
    }

    if (mode === 'jwt-or-visitor') {
      await this.validateVisitor(req);
      return true;
    }

    throw new UnauthorizedException('Operação não autorizada');
  }

  private extractBearer(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }

    const token = header.slice(7).trim();
    return token || null;
  }

  private async validateVisitor(req: RequestWithAuth): Promise<void> {
    const visitorId = this.headerValue(req, 'x-visitor-id');
    const timestamp = this.headerValue(req, 'x-timestamp');
    const signature = this.headerValue(req, 'x-signature');

    if (!visitorId || !timestamp || !signature) {
      throw new UnauthorizedException('Operação não autorizada');
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || !isTimestampFresh(timestampSeconds)) {
      throw new UnauthorizedException('Operação não autorizada');
    }

    const visitor = await this.prismaRead.visitor.findUnique({
      where: { id: visitorId },
    });

    if (!visitor || !visitor.verified) {
      throw new UnauthorizedException('Operação não autorizada');
    }

    let publicKey;
    try {
      publicKey = parseSpkiPublicKey(visitor.publicKey);
    } catch {
      throw new UnauthorizedException('Operação não autorizada');
    }

    const bodyHash = this.bodyHashHex(req);
    const pathWithQuery = req.originalUrl || req.url;
    const canonical = buildRequestCanonical(
      req.method,
      pathWithQuery,
      timestamp,
      bodyHash,
    );

    const valid = verifyEcdsaP256Sha256(publicKey, canonical, signature);
    if (!valid) {
      throw new UnauthorizedException('Operação não autorizada');
    }

    const replayKey = `sig:${visitorId}:${timestamp}:${sha256Hex(signature)}`;
    const stored = await this.redis.setNx(
      replayKey,
      '1',
      VISITOR_REPLAY_TTL_SECONDS,
    );

    if (!stored) {
      throw new UnauthorizedException('Operação não autorizada');
    }

    req.user = { tipo: 'visitor', id: visitor.id };
  }

  private bodyHashHex(req: RequestWithAuth): string {
    if (req.rawBody && req.rawBody.length > 0) {
      return sha256Hex(req.rawBody);
    }

    return sha256Hex('');
  }

  private headerValue(req: Request, name: string): string | null {
    const value = req.headers[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value) && value[0]?.trim()) {
      return value[0].trim();
    }

    return null;
  }
}
