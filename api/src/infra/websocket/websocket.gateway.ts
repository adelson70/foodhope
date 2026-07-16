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

@WebSocketGateway({ cors: { origin: '*' } })
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(WebsocketGateway.name);

    constructor(private readonly jwtService: JwtService) {}

    afterInit(server: Server) {
        server.use(async (socket, next) => {
            try {
                const token = 
                    socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Acesso negado: Token não fornecido'));
                }

                const payload = await this.jwtService.verifyAsync(token, {
                    secret: process.env.JWT_SECRET 
                });

                socket.data.user = payload; 
                
                return next(); 
            } catch (error) {
                next(new Error('Acesso negado: Token inválido ou expirado'));
            }
        });

        this.logger.debug('Servidor WebSocket ON');
    }

    handleConnection(client: Socket) {
        const user = client.data.user;
        this.logger.log(`[WebSocket] Cliente conectado: ${client.id} (User ID: ${user?.sub || user?.id})`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`[WebSocket] Cliente desconectado: ${client.id}`);
    }

    emitirEvento(evento: string, payload: any) {
        this.server.emit(evento, payload);
    }
}