export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function numberToCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

export function centsToNumber(cents: number): number {
  return cents / 100;
}

export function digitsToCents(digits: string, maxDigits = 10): number {
  const cleaned = onlyDigits(digits).slice(0, maxDigits);
  if (!cleaned) return 0;
  return Number(cleaned);
}

export function formatBrlFromCents(cents: number): string {
  return centsToNumber(cents).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBrlFromNumber(value: number): string {
  return formatBrlFromCents(numberToCents(value));
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
