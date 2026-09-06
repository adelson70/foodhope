import {
  idbGet,
  idbPut,
  STORE_CARDAPIO_OPERADOR,
} from './clientIdb';
import type { Produto } from '../services/types';

const CARDAPIO_KEY = 'lista';

export type CardapioOperadorCache = {
  produtos: Produto[];
  updatedAt: string;
};

export async function salvarCardapioOperador(
  produtos: Produto[],
): Promise<void> {
  const value: CardapioOperadorCache = {
    produtos,
    updatedAt: new Date().toISOString(),
  };
  await idbPut(STORE_CARDAPIO_OPERADOR, CARDAPIO_KEY, value);
}

export async function obterCardapioOperador(): Promise<
  CardapioOperadorCache | undefined
> {
  return idbGet<CardapioOperadorCache>(STORE_CARDAPIO_OPERADOR, CARDAPIO_KEY);
}
