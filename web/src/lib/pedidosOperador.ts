import { idbGet, idbPut, STORE_PEDIDOS_OPERADOR } from './clientIdb';
import type { Pedido } from '../services/types';

export type PedidosOperadorCache = {
  pedidos: Pedido[];
  updatedAt: string;
};

function chave(dia: string): string {
  return dia || 'todos';
}

/** Guarda a primeira página da lista do dia para abrir o painel offline. */
export async function salvarPedidosOperador(
  dia: string,
  pedidos: Pedido[],
): Promise<void> {
  const value: PedidosOperadorCache = {
    pedidos,
    updatedAt: new Date().toISOString(),
  };
  await idbPut(STORE_PEDIDOS_OPERADOR, chave(dia), value);
}

export async function obterPedidosOperador(
  dia: string,
): Promise<PedidosOperadorCache | undefined> {
  return idbGet<PedidosOperadorCache>(STORE_PEDIDOS_OPERADOR, chave(dia));
}
