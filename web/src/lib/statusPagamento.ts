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
