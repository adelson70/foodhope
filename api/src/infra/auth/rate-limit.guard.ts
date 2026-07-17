import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';

import type { AuthUser } from './auth.guard.js';
import {
  RATE_LIMIT_LOGIN_MAX,
  RATE_LIMIT_OPERADOR_MAX,
  RATE_LIMIT_OPERADOR_PEDIDO_MAX,
  RATE_LIMIT_VISITOR_CONFIRM_MAX,
  RATE_LIMIT_VISITOR_MAX,
  RATE_LIMIT_VISITOR_PEDIDO_MAX,
  RATE_LIMIT_VISITOR_REGISTER_MAX,
  RATE_LIMIT_WINDOW_SECONDS,
} from './rate-limit.constants.js';
import { RateLimitService } from './rate-limit.service.js';

type RequestWithAuth = Request & {
  user?: AuthUser;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const method = (req.method || 'GET').toUpperCase();
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (method === 'POST' && path === '/auth/login') {
      const nome = this.asNonEmptyString(body.nome);
      if (nome) {
        await this.rateLimit.consume(
          `rl:login:${nome.toLowerCase()}`,
          RATE_LIMIT_LOGIN_MAX,
          RATE_LIMIT_WINDOW_SECONDS,
        );
      }
      return true;
    }

    if (method === 'POST' && path === '/visitor/register') {
      const publicKey = this.asNonEmptyString(body.publicKey);
      if (publicKey) {
        const keyId = createHash('sha256').update(publicKey).digest('hex');
        await this.rateLimit.consume(
          `rl:visitor-register:${keyId}`,
          RATE_LIMIT_VISITOR_REGISTER_MAX,
          RATE_LIMIT_WINDOW_SECONDS,
        );
      }
      return true;
    }

    if (method === 'POST' && path === '/visitor/confirm') {
      const visitorId = this.asNonEmptyString(body.visitorId);
      if (visitorId) {
        await this.rateLimit.consume(
          `rl:visitor-confirm:${visitorId}`,
          RATE_LIMIT_VISITOR_CONFIRM_MAX,
          RATE_LIMIT_WINDOW_SECONDS,
        );
      }
      return true;
    }

    if (req.user?.tipo === 'visitor') {
      await this.rateLimit.consume(
        `rl:visitor:${req.user.id}`,
        RATE_LIMIT_VISITOR_MAX,
        RATE_LIMIT_WINDOW_SECONDS,
      );

      if (method === 'POST' && path === '/pedido') {
        await this.rateLimit.consume(
          `rl:visitor:pedido:${req.user.id}`,
          RATE_LIMIT_VISITOR_PEDIDO_MAX,
          RATE_LIMIT_WINDOW_SECONDS,
        );
      }
      return true;
    }

    if (req.user?.tipo === 'operador') {
      await this.rateLimit.consume(
        `rl:operador:${req.user.id}`,
        RATE_LIMIT_OPERADOR_MAX,
        RATE_LIMIT_WINDOW_SECONDS,
      );

      if (method === 'POST' && path === '/pedido') {
        await this.rateLimit.consume(
          `rl:operador:pedido:${req.user.id}`,
          RATE_LIMIT_OPERADOR_PEDIDO_MAX,
          RATE_LIMIT_WINDOW_SECONDS,
        );
      }
    }

    return true;
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }
}
