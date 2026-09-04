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
import { hashesTelaPedidosIguais } from '../../modules/tela-pedidos/tela-pedidos-hash.js';
import type { RoleOperador } from '../../../generated/prisma/enums.js';

export const WS_ROOM_OPERADORES = 'operadores';
export const WS_ROOM_CLIENTES = 'clientes';
export const WS_ROOM_MONITORES = 'monitores';
export const TELA_PEDIDOS_PRONTOS = 'pedidos-prontos';

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
  | { tipo: 'visitor'; id: string }
  | { tipo: 'monitor' };

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
        const monitorHash = socket.handshake.auth?.monitorHash as
          | string
          | undefined;
        const tela = socket.handshake.auth?.tela;

        if (
          typeof monitorHash === 'string' &&
          monitorHash.trim() &&
          tela === TELA_PEDIDOS_PRONTOS
        ) {
          const config = await this.prismaRead.configTelaPedidos.findUnique({
            where: { id: 'default' },
          });

          if (
            !config?.hash ||
            !hashesTelaPedidosIguais(config.hash, monitorHash.trim())
          ) {
            return next(new Error('Acesso negado: Hash do monitor inválido'));
          }

          socket.data.user = { tipo: 'monitor' } satisfies SocketUser;
          return next();
        }

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
      this.registrarMonitor(client);
    } else if (user?.tipo === 'visitor') {
      void client.join(WS_ROOM_CLIENTES);
    } else if (user?.tipo === 'monitor') {
      this.registrarMonitor(client);
    }

    this.logger.log(
      `[WebSocket] Cliente conectado: ${client.id} (${user?.tipo ?? 'desconhecido'}:${user && 'id' in user ? user.id : '-'})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Cliente desconectado: ${client.id}`);
  }

  emitirParaOperadores(evento: string, payload: unknown) {
    this.server.to(WS_ROOM_OPERADORES).emit(evento, payload);
  }

  emitirParaClientes(evento: string, payload: unknown) {
    this.server.to(WS_ROOM_CLIENTES).emit(evento, payload);
  }

  emitirParaMonitores(evento: string, payload: unknown) {
    this.server.to(WS_ROOM_MONITORES).emit(evento, payload);
  }

  private registrarMonitor(client: Socket) {
    const tela = client.handshake.auth?.tela;
    if (tela !== TELA_PEDIDOS_PRONTOS) return;

    const labelRaw = client.handshake.auth?.label;
    const labelBase =
      typeof labelRaw === 'string' && labelRaw.trim()
        ? labelRaw.trim().slice(0, 80)
        : 'Tela de pedidos prontos';

    client.data.tela = TELA_PEDIDOS_PRONTOS;
    client.data.label = `${labelBase} (${client.id.slice(0, 4)})`;
    client.data.conectadoEm = new Date().toISOString();
    void client.join(WS_ROOM_MONITORES);
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
