import { Injectable, Logger } from '@nestjs/common';
import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

import { PrismaWriteService } from '../database/prisma-write.service.js';

/** Erros do FCM que significam token morto (app desinstalado, permissão revogada...). */
const TOKEN_INVALIDO = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/**
 * Aviso de "pedido pronto" por Firebase Cloud Messaging (Web Push no Android e,
 * no iOS 16.4+, só com o app adicionado à tela de início).
 * Sem FIREBASE_SERVICE_ACCOUNT_BASE64 o envio fica desligado e só registra no log.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private messaging: Messaging | null | undefined;

  constructor(private readonly prismaWrite: PrismaWriteService) {}

  private obterMessaging(): Messaging | null {
    if (this.messaging !== undefined) return this.messaging;

    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
    if (!base64) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 ausente: push desligado.');
      this.messaging = null;
      return null;
    }

    try {
      const conta = JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as ServiceAccount;
      const app: App = getApps()[0] ?? initializeApp({ credential: cert(conta) });
      this.messaging = getMessaging(app);
    } catch (erro) {
      this.logger.error(`Credencial do Firebase inválida: ${String(erro)}`);
      this.messaging = null;
    }
    return this.messaging;
  }

  async inscrever(pedidoId: string, token: string) {
    await this.prismaWrite.pushPedido.upsert({
      where: { pedidoId_token: { pedidoId, token } },
      create: { pedidoId, token },
      update: {},
    });
  }

  /** Envia o aviso para os aparelhos inscritos no pedido e apaga as inscrições. */
  async avisarPedidoPronto(pedidoId: string, numero: string) {
    const inscricoes = await this.prismaWrite.pushPedido.findMany({
      where: { pedidoId },
      select: { token: true },
    });
    if (inscricoes.length === 0) return;

    const messaging = this.obterMessaging();
    if (messaging) {
      const tokens = inscricoes.map((i) => i.token);
      try {
        // Só "data": quem mostra a notificação é o nosso service worker (sw.ts).
        const resposta = await messaging.sendEachForMulticast({
          tokens,
          data: {
            tipo: 'pedido-pronto',
            pedidoId,
            numero,
            titulo: 'Seu pedido está pronto!',
            corpo: `Pedido #${numero} pronto para retirada.`,
            url: '/pedidos',
          },
          webpush: {
            headers: { Urgency: 'high', TTL: String(60 * 60) },
          },
        });
        resposta.responses.forEach((r, i) => {
          if (!r.success && !TOKEN_INVALIDO.has(r.error?.code ?? '')) {
            this.logger.warn(`Push falhou (${tokens[i].slice(0, 12)}…): ${r.error?.code}`);
          }
        });
      } catch (erro) {
        this.logger.error(`Falha ao enviar push do pedido ${numero}: ${String(erro)}`);
      }
    }

    // O aviso é único por pedido: depois de tentar, as inscrições não servem mais.
    await this.prismaWrite.pushPedido.deleteMany({ where: { pedidoId } });
  }
}
