import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

const BASE_URL = 'https://api.checkout.infinitepay.io';
const TIMEOUT_MS = 15_000;

export type InfinitePayItem = {
  quantity: number;
  price: number;
  description: string;
};

export type CreateLinkInput = {
  handle: string;
  items: InfinitePayItem[];
  order_nsu?: string;
  redirect_url?: string;
  webhook_url?: string;
  customer?: {
    name: string;
    phone_number?: string;
  };
};

export type CreateLinkResult = {
  url: string;
  slug: string | null;
};

export type PaymentCheckInput = {
  handle: string;
  order_nsu: string;
  transaction_nsu: string;
  slug: string;
};

export type PaymentCheckResult = {
  success: boolean;
  paid: boolean;
  amount: number;
  paid_amount: number;
  installments: number;
  capture_method: string | null;
};

@Injectable()
export class InfinitePayClient {
  private readonly logger = new Logger(InfinitePayClient.name);

  async criarLink(input: CreateLinkInput): Promise<CreateLinkResult> {
    const body = await this.postJson('/links', {
      handle: input.handle,
      items: input.items,
      ...(input.order_nsu ? { order_nsu: input.order_nsu } : {}),
      ...(input.redirect_url ? { redirect_url: input.redirect_url } : {}),
      ...(input.webhook_url ? { webhook_url: input.webhook_url } : {}),
      ...(input.customer ? { customer: input.customer } : {}),
    });

    const url =
      this.asNonEmptyString(body.url) ??
      this.asNonEmptyString(body.checkout_url) ??
      this.asNonEmptyString(body.link);

    if (!url) {
      this.logger.error('Resposta InfinitePay sem URL de checkout', body);
      throw new InternalServerErrorException(
        'A InfinitePay não retornou o link de pagamento.',
      );
    }

    return {
      url,
      slug: this.asNonEmptyString(body.slug),
    };
  }

  async testarHandle(handle: string): Promise<CreateLinkResult> {
    return this.criarLink({
      handle,
      items: [
        {
          quantity: 1,
          price: 100,
          description: 'Teste Food Hope',
        },
      ],
      order_nsu: `teste-${Date.now()}`,
    });
  }

  async verificarPagamento(
    input: PaymentCheckInput,
  ): Promise<PaymentCheckResult> {
    const body = await this.postJson('/payment_check', {
      handle: input.handle,
      order_nsu: input.order_nsu,
      transaction_nsu: input.transaction_nsu,
      slug: input.slug,
    });

    return {
      success: Boolean(body.success),
      paid: Boolean(body.paid),
      amount: Number(body.amount) || 0,
      paid_amount: Number(body.paid_amount) || 0,
      installments: Number(body.installments) || 1,
      capture_method: this.asNonEmptyString(body.capture_method),
    };
  }

  private async postJson(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let body: Record<string, unknown> = {};
      try {
        body = (await response.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }

      if (!response.ok) {
        const message =
          this.asNonEmptyString(body.message) ??
          this.asNonEmptyString(body.error) ??
          `InfinitePay retornou HTTP ${response.status}`;
        this.logger.warn(`InfinitePay ${path}: ${message}`);
        throw new BadRequestException(message);
      }

      return body;
    } catch (erro) {
      if (erro instanceof BadRequestException) {
        throw erro;
      }

      if (erro instanceof Error && erro.name === 'AbortError') {
        throw new InternalServerErrorException(
          'Tempo esgotado ao falar com a InfinitePay.',
        );
      }

      this.logger.error(`Falha ao chamar InfinitePay ${path}`, erro);
      throw new InternalServerErrorException(
        'Não foi possível comunicar com a InfinitePay.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }
}
