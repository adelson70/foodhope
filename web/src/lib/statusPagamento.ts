import type { StatusPagamento } from '../services/types';

export const STATUS_PAGAMENTO_PADRAO: StatusPagamento = 'PAGO';

export const STATUS_PAGAMENTO_OPCOES: Array<{
  value: StatusPagamento;
  label: string;
}> = [
  { value: 'PAGO', label: 'Pago' },
  { value: 'NAO_PAGO', label: 'Não pago' },
  { value: 'GRATUITO', label: 'Gratuito' },
];

export function rotuloStatusPagamento(
  status?: StatusPagamento | null,
): string {
  if (status === 'NAO_PAGO') return 'Não pago';
  if (status === 'GRATUITO') return 'Gratuito';
  return 'Pago';
}

export function pedidoPendentePagamento(
  status?: StatusPagamento | null,
): boolean {
  return status === 'NAO_PAGO';
}

/**
 * Meio de pagamento de um pedido pago. `meio` é o `capture_method` do InfinitePay; sem checkout
 * online, o pedido foi lançado no painel/totem e pago no caixa.
 */
export function rotuloMeioPagamento(
  meio?: string | null,
  parcelas?: number | null,
): string {
  if (!meio) return 'Caixa';
  if (meio === 'pix') return 'Pix';
  if (meio === 'debit_card') return 'Débito';
  if (meio === 'credit_card') {
    return parcelas && parcelas > 1 ? `Crédito ${parcelas}x` : 'Crédito';
  }
  return meio.replace(/_/g, ' ');
}
