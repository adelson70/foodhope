import { randomBytes, timingSafeEqual } from 'node:crypto';

export function gerarHashTelaPedidos(): string {
  return randomBytes(32).toString('hex');
}

export function hashesTelaPedidosIguais(
  esperado: string,
  recebido: string,
): boolean {
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(recebido, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
