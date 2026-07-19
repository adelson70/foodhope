import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrismaReadService } from '../database/prisma-read.service.js';
import { RedisService } from '../cache/redis.service.js';
import { validateVisitorSocketAuth } from '../auth/visitor-auth.js';
import type { RoleOperador } from '../../../generated/prisma/enums.js';

export const WS_ROOM_OPERADORES = 'operadores';
export const WS_ROOM_CLIENTES = 'clientes';

export function roomDoOperador(id: string) {
  return `operador:${id}`;
}

export type CardapioProdutoPayload = {
  id: string;
  ativo: boolean;
};

export type CardapioAdicionalPayload = {
  id: string;
  ativo: boolean;
  escopo: 'global' | 'produto';
  produtoId?: string;
};

type SocketUser =
  | { tipo: 'operador'; id: string; role: RoleOperador }
  | { tipo: 'visitor'; id: string };

@WebSocketGateway({ cors: { origin: '*' } })
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaRead: PrismaReadService,
    private readonly redis: RedisService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.split(' ')[1];

        if (token) {
          const payload = await this.jwtService.verifyAsync<{
            id: string;
            role: RoleOperador;
          }>(token, { secret: process.env.JWT_SECRET });

          if (!payload?.id) {
            return next(new Error('Acesso negado: Token inválido'));
          }

          socket.data.user = {
            tipo: 'operador',
            id: payload.id,
            role: payload.role ?? 'OPERADOR',
          } satisfies SocketUser;
          return next();
        }

        const visitorId = socket.handshake.auth?.visitorId as
          | string
          | undefined;
        const timestamp = socket.handshake.auth?.timestamp as
          | string
          | undefined;
        const signature = socket.handshake.auth?.signature as
          | string
          | undefined;

        if (!visitorId || !timestamp || !signature) {
          return next(new Error('Acesso negado: Credenciais não fornecidas'));
        }

        const visitor = await validateVisitorSocketAuth({
          visitorId,
          timestamp,
          signature,
          prismaRead: this.prismaRead,
          redis: this.redis,
        });

        socket.data.user = visitor satisfies SocketUser;
        return next();
      } catch {
        next(new Error('Acesso negado: Autenticação inválida ou expirada'));
      }
    });

    this.logger.debug('Servidor WebSocket ON');
  }

  handleConnection(client: Socket) {
    const user = client.data.user as SocketUser | undefined;

    if (user?.tipo === 'operador') {
      void client.join(WS_ROOM_OPERADORES);
      void client.join(roomDoOperador(user.id));
    } else if (user?.tipo === 'visitor') {
      void client.join(WS_ROOM_CLIENTES);
    }

    this.logger.log(
      `[WebSocket] Cliente conectado: ${client.id} (${user?.tipo ?? 'desconhecido'}:${user?.id ?? '-'})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Cliente desconectado: ${client.id}`);
  }

  emitirParaOperadores(evento: string, payload: unknown) {
    this.server.to(WS_ROOM_OPERADORES).emit(evento, payload);
  }

  forcarLogout(operadorId: string) {
    this.server.to(roomDoOperador(operadorId)).emit('sessao:logout');
  }

  emitirCardapio(evento: string, payload: unknown) {
    this.server.to(WS_ROOM_CLIENTES).emit(evento, payload);
    this.server.to(WS_ROOM_OPERADORES).emit(evento, payload);
  }

  emitirProdutoAtivo(payload: CardapioProdutoPayload) {
    this.emitirCardapio('cardapio:produto', payload);
  }

  emitirAdicionalAtivo(payload: CardapioAdicionalPayload) {
    this.emitirCardapio('cardapio:adicional', payload);
  }
}
