import type { TipoConsumo } from '../services/types';

export const TIPO_CONSUMO_PADRAO: TipoConsumo = 'COMER_AQUI';

export const TIPO_CONSUMO_OPCOES: Array<{
  value: TipoConsumo;
  label: string;
}> = [
  { value: 'COMER_AQUI', label: 'Comer aqui' },
  { value: 'LEVAR', label: 'Levar' },
];

export function rotuloTipoConsumo(tipo?: TipoConsumo | null): string {
  return tipo === 'LEVAR' ? 'Levar' : 'Comer aqui';
}
