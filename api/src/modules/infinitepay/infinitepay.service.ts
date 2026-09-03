import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { CriarPedidoDto } from '../pedido/dto/criar.dto.js';
import { PedidoService } from '../pedido/pedido.service.js';
import {
  ConfigurarInfinitePayDto,
  ConfirmarCheckoutDto,
} from './dto/infinitepay.dto.js';
import { InfinitePayClient } from './infinitepay.client.js';

const CONFIG_ID = 'default';

type CheckoutPayload = {
  cliente: CriarPedidoDto['cliente'];
  itens: CriarPedidoDto['itens'];
  tipo_consumo?: CriarPedidoDto['tipo_consumo'];
};

type WebhookBody = {
  invoice_slug?: string;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
  transaction_nsu?: string;
  order_nsu?: string;
  receipt_url?: string;
  items?: unknown;
};

@Injectable()
export class InfinitePayService {
  private readonly logger = new Logger(InfinitePayService.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly client: InfinitePayClient,
    private readonly pedido: PedidoService,
  ) {}

  async obter() {
    try {
      const config = await this.prismaRead.configInfinitePay.findUnique({
        where: { id: CONFIG_ID },
        select: { handle: true },
      });

      return {
        dados: {
          handle: config?.handle ?? null,
          webhookUrl: this.webhookUrlPublica(),
        },
      };
    } catch (erro) {
      this.logger.error('Erro ao obter config InfinitePay', erro);
      throw new InternalServerErrorException(
        'Não foi possível carregar a configuração da InfinitePay.',
      );
    }
  }

  async salvar(dto: ConfigurarInfinitePayDto) {
    try {
      const handle = dto.handle.trim().replace(/^\$+/, '');
      if (!handle) {
        throw new BadRequestException('Informe a InfiniteTag (handle)');
      }

      const config = await this.prismaWrite.configInfinitePay.upsert({
        where: { id: CONFIG_ID },
        create: { id: CONFIG_ID, handle },
        update: { handle },
        select: { handle: true },
      });

      return {
        mensagem: 'InfinitePay configurada com sucesso',
        dados: {
          handle: config.handle,
          webhookUrl: this.webhookUrlPublica(),
        },
      };
    } catch (erro) {
      if (erro instanceof BadRequestException) throw erro;
      this.logger.error('Erro ao salvar config InfinitePay', erro);
      throw new InternalServerErrorException(
        'Não foi possível salvar a configuração da InfinitePay.',
      );
    }
  }

  async iniciarCheckout(dto: CriarPedidoDto) {
    const handle = await this.obterHandleObrigatorio();
    const { items, amountCentavos, payload } =
      await this.montarItensDoBanco(dto);

    const orderNsu = randomUUID();
    const redirectUrl = this.redirectUrl();
    const webhookUrl = this.webhookUrlObrigatoria();

    const sessao = await this.prismaWrite.checkoutSessao.create({
      data: {
        id: orderNsu,
        payload: payload as object,
        amountCentavos,
      },
    });

    const nomeCliente = [dto.cliente.primeiro_nome, dto.cliente.sobrenome]
      .filter(Boolean)
      .join(' ');

    const telefone = dto.cliente.contato?.trim();
    const customer = {
      name: nomeCliente,
      ...(telefone ? { phone_number: `+${telefone.replace(/^\+/, '')}` } : {}),
    };

    try {
      const link = await this.client.criarLink({
        handle,
        items,
        order_nsu: sessao.id,
        redirect_url: redirectUrl,
        webhook_url: webhookUrl,
        customer,
      });

      await this.prismaWrite.checkoutSessao.update({
        where: { id: sessao.id },
        data: {
          checkoutUrl: link.url,
          invoiceSlug: link.slug,
        },
      });

      return {
        mensagem: 'Link de pagamento gerado',
        dados: {
          url: link.url,
          order_nsu: sessao.id,
        },
      };
    } catch (erro) {
      await this.prismaWrite.checkoutSessao
        .delete({ where: { id: sessao.id } })
        .catch(() => undefined);
      throw erro;
    }
  }

  async confirmarCheckout(dto: ConfirmarCheckoutDto) {
    const sessao = await this.prismaRead.checkoutSessao.findUnique({
      where: { id: dto.order_nsu },
    });

    if (!sessao) {
      throw new BadRequestException('Sessão de checkout não encontrada.');
    }

    if (sessao.pedidoId) {
      const pedido = await this.buscarPedidoFormatado(sessao.pedidoId);
      return {
        mensagem: 'Pedido já confirmado',
        dados: { pedido },
      };
    }

    const handle = await this.obterHandleObrigatorio();
    const check = await this.client.verificarPagamento({
      handle,
      order_nsu: dto.order_nsu,
      transaction_nsu: dto.transaction_nsu,
      slug: dto.slug,
    });

    if (!check.success || !check.paid) {
      throw new BadRequestException('Pagamento ainda não confirmado.');
    }

    if (check.amount > 0 && check.amount !== sessao.amountCentavos) {
      this.logger.warn(
        `Valor divergente order_nsu=${sessao.id} esperado=${sessao.amountCentavos} recebido=${check.amount}`,
      );
      throw new BadRequestException('Valor do pagamento não confere.');
    }

    const pedido = await this.finalizarSessaoPaga({
      orderNsu: sessao.id,
      transactionNsu: dto.transaction_nsu,
      invoiceSlug: dto.slug,
      receiptUrl: dto.receipt_url ?? null,
      captureMethod: check.capture_method ?? dto.capture_method ?? null,
      installments: check.installments,
      amount: check.amount || sessao.amountCentavos,
    });

    return {
      mensagem: 'Pedido confirmado com sucesso',
      dados: { pedido },
    };
  }

  async processarWebhook(body: WebhookBody): Promise<{
    ok: boolean;
    status: 200 | 400;
    message: string | null;
  }> {
    const orderNsu = this.asNonEmptyString(body.order_nsu);
    const transactionNsu = this.asNonEmptyString(body.transaction_nsu);
    const invoiceSlug = this.asNonEmptyString(body.invoice_slug);
    const amount = Number(body.amount);

    if (!orderNsu || !transactionNsu) {
      return {
        ok: false,
        status: 400,
        message: 'Payload incompleto',
      };
    }

    const sessao = await this.prismaRead.checkoutSessao.findUnique({
      where: { id: orderNsu },
    });

    if (!sessao) {
      return {
        ok: false,
        status: 400,
        message: 'Pedido não encontrado',
      };
    }

    if (sessao.pedidoId || sessao.transactionNsu === transactionNsu) {
      return { ok: true, status: 200, message: null };
    }

    if (Number.isFinite(amount) && amount !== sessao.amountCentavos) {
      this.logger.warn(
        `Webhook valor divergente order_nsu=${orderNsu} esperado=${sessao.amountCentavos} amount=${amount}`,
      );
      return {
        ok: false,
        status: 400,
        message: 'Valor do pagamento não confere',
      };
    }

    try {
      await this.finalizarSessaoPaga({
        orderNsu,
        transactionNsu,
        invoiceSlug,
        receiptUrl: this.asNonEmptyString(body.receipt_url),
        captureMethod: this.asNonEmptyString(body.capture_method),
        installments:
          typeof body.installments === 'number' ? body.installments : null,
        amount: Number.isFinite(amount) ? amount : sessao.amountCentavos,
      });
      return { ok: true, status: 200, message: null };
    } catch (erro) {
      this.logger.error(`Falha no webhook order_nsu=${orderNsu}`, erro);
      return {
        ok: false,
        status: 400,
        message: 'Não foi possível processar o pagamento',
      };
    }
  }

  private async finalizarSessaoPaga(input: {
    orderNsu: string;
    transactionNsu: string;
    invoiceSlug: string | null;
    receiptUrl: string | null;
    captureMethod: string | null;
    installments: number | null;
    amount: number;
  }) {
    const existentePorTx = await this.prismaWrite.checkoutSessao.findUnique({
      where: { transactionNsu: input.transactionNsu },
    });
    if (existentePorTx?.pedidoId) {
      return this.buscarPedidoFormatado(existentePorTx.pedidoId);
    }

    const sessaoAtual = await this.prismaWrite.checkoutSessao.findUnique({
      where: { id: input.orderNsu },
    });

    if (!sessaoAtual) {
      throw new BadRequestException('Sessão de checkout não encontrada.');
    }

    if (sessaoAtual.pedidoId) {
      return this.buscarPedidoFormatado(sessaoAtual.pedidoId);
    }

    const claimed = await this.prismaWrite.checkoutSessao.updateMany({
      where: {
        id: input.orderNsu,
        pedidoId: null,
        transactionNsu: null,
      },
      data: {
        transactionNsu: input.transactionNsu,
        invoiceSlug: input.invoiceSlug,
        receiptUrl: input.receiptUrl,
        captureMethod: input.captureMethod,
        installments: input.installments,
      },
    });

    if (claimed.count === 0) {
      const deNovo = await this.prismaWrite.checkoutSessao.findUnique({
        where: { id: input.orderNsu },
      });
      if (deNovo?.pedidoId) {
        return this.buscarPedidoFormatado(deNovo.pedidoId);
      }
      const porTx = await this.prismaWrite.checkoutSessao.findUnique({
        where: { transactionNsu: input.transactionNsu },
      });
      if (porTx?.pedidoId) {
        return this.buscarPedidoFormatado(porTx.pedidoId);
      }
      throw new BadRequestException(
        'Pagamento em processamento. Tente novamente.',
      );
    }

    const sessaoLocked = await this.prismaWrite.checkoutSessao.findUnique({
      where: { id: input.orderNsu },
    });
    if (!sessaoLocked) {
      throw new BadRequestException('Sessão de checkout não encontrada.');
    }

    const payload = sessaoLocked.payload as unknown as CheckoutPayload;
    const dto: CriarPedidoDto = {
      cliente: payload.cliente,
      itens: payload.itens,
      tipo_consumo: payload.tipo_consumo,
    };

    const criado = await this.pedido.criarPedidoPago(dto, true);
    const pedido = criado.dados.pedido;

    await this.prismaWrite.checkoutSessao.update({
      where: { id: input.orderNsu },
      data: {
        pagoAt: new Date(),
        pedidoId: pedido.id,
      },
    });

    return pedido;
  }

  private async montarItensDoBanco(dto: CriarPedidoDto) {
    if (!dto.itens?.length) {
      throw new BadRequestException('Adicione ao menos um item.');
    }

    const items: Array<{
      quantity: number;
      price: number;
      description: string;
    }> = [];
    let amountCentavos = 0;

    for (const itemDto of dto.itens) {
      const produto = await this.prismaRead.produto.findUnique({
        where: { id: itemDto.id },
      });

      if (!produto || !produto.ativo) {
        throw new BadRequestException(
          `Produto ${itemDto.id} indisponível.`,
        );
      }

      const precoProdutoCentavos = Math.round(Number(produto.preco) * 100);
      let linhaCentavos = precoProdutoCentavos * itemDto.qtd;
      const descricoesAdic: string[] = [];

      if (itemDto.adicional?.length) {
        for (const addDto of itemDto.adicional) {
          const adicionalEspecifico =
            await this.prismaRead.adicionalProduto.findFirst({
              where: {
                id: addDto.id,
                produto_id: produto.id,
                ativo: true,
              },
            });

          if (adicionalEspecifico) {
            const centavos = Math.round(
              Number(adicionalEspecifico.preco) * 100,
            );
            linhaCentavos += centavos * addDto.qtd;
            descricoesAdic.push(
              `${addDto.qtd}x ${adicionalEspecifico.nome}`,
            );
            continue;
          }

          const adicionalGlobal =
            await this.prismaRead.adicionalGlobal.findFirst({
              where: {
                id: addDto.id,
                ativo: true,
                produtos: { some: { produto_id: produto.id } },
              },
            });

          if (!adicionalGlobal) {
            throw new BadRequestException(
              `Adicional ${addDto.id} indisponível.`,
            );
          }

          const centavos = Math.round(Number(adicionalGlobal.preco) * 100);
          linhaCentavos += centavos * addDto.qtd;
          descricoesAdic.push(`${addDto.qtd}x ${adicionalGlobal.nome}`);
        }
      }

      const description = [
        produto.nome,
        descricoesAdic.length ? `(${descricoesAdic.join(', ')})` : null,
      ]
        .filter(Boolean)
        .join(' ');

      items.push({
        quantity: itemDto.qtd,
        price: Math.round(linhaCentavos / itemDto.qtd),
        description,
      });
      amountCentavos += linhaCentavos;
    }

    if (amountCentavos <= 0) {
      throw new BadRequestException('Valor do pedido inválido.');
    }

    const payload: CheckoutPayload = {
      cliente: dto.cliente,
      itens: dto.itens,
      tipo_consumo: dto.tipo_consumo,
    };

    return { items, amountCentavos, payload };
  }

  private async obterHandleObrigatorio() {
    const config = await this.prismaRead.configInfinitePay.findUnique({
      where: { id: CONFIG_ID },
      select: { handle: true },
    });
    const handle = config?.handle?.trim();
    if (!handle) {
      throw new BadRequestException(
        'InfinitePay não configurada. Configure a InfiniteTag em Configurações.',
      );
    }
    return handle;
  }

  private webhookUrlPublica(): string | null {
    const base = process.env.API_PUBLIC_URL?.replace(/\/$/, '');
    if (!base) return null;
    return `${base}/webhook/infinitepay`;
  }

  private webhookUrlObrigatoria() {
    const url = this.webhookUrlPublica();
    if (!url) {
      throw new BadRequestException(
        'API_PUBLIC_URL não configurada para receber o webhook da InfinitePay.',
      );
    }
    return url;
  }

  private redirectUrl() {
    const app = process.env.APP?.replace(/\/$/, '');
    if (!app) {
      throw new BadRequestException(
        'APP não configurada para redirecionar após o pagamento.',
      );
    }
    return `${app}/confirmado`;
  }

  private async buscarPedidoFormatado(pedidoId: string) {
    const pedido = await this.prismaRead.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: { include: { produto: true } } },
    });
    if (!pedido) {
      throw new BadRequestException('Pedido não encontrado.');
    }
    return {
      ...pedido,
      numero: pedido.numero.toString(),
      prontoAt: pedido.prontoAt ? pedido.prontoAt.toISOString() : null,
      pronto: Boolean(pedido.prontoAt),
      pago: Boolean(pedido.pago),
    };
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }
}
