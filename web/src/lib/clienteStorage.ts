import {
  idbGet,
  idbPut,
  STORE_CARRINHO,
  STORE_CLIENTE,
  STORE_PEDIDOS,
} from './clientIdb';
import type { CarrinhoItem, ClienteLocal, PedidoLocal } from './clienteTypes';

export type {
  CarrinhoItem,
  ClienteLocal,
  PedidoLocal,
  PedidoLocalItem,
} from './clienteTypes';

type CarrinhoRecord = {
  itens: CarrinhoItem[];
};

export async function loadCarrinho(
  visitorId: string,
): Promise<CarrinhoItem[]> {
  const record = await idbGet<CarrinhoRecord>(STORE_CARRINHO, visitorId);
  return record?.itens ?? [];
}

export async function saveCarrinho(
  visitorId: string,
  itens: CarrinhoItem[],
): Promise<void> {
  await idbPut(STORE_CARRINHO, visitorId, { itens });
}

export async function loadPedidosLocais(
  visitorId: string,
): Promise<PedidoLocal[]> {
  const list = await idbGet<PedidoLocal[]>(STORE_PEDIDOS, visitorId);
  return list ?? [];
}

export async function appendPedidoLocal(
  visitorId: string,
  pedido: PedidoLocal,
): Promise<void> {
  const atual = await loadPedidosLocais(visitorId);
  const next = [pedido, ...atual.filter((item) => item.id !== pedido.id)];
  await idbPut(STORE_PEDIDOS, visitorId, next);
}

export async function loadClienteLocal(
  visitorId: string,
): Promise<ClienteLocal | null> {
  const perfil = await idbGet<ClienteLocal>(STORE_CLIENTE, visitorId);
  if (
    !perfil?.primeiro_nome ||
    !perfil?.sobrenome ||
    !perfil?.contato ||
    !perfil?.cidade
  ) {
    return null;
  }
  return perfil;
}

export async function saveClienteLocal(
  visitorId: string,
  cliente: ClienteLocal,
): Promise<void> {
  await idbPut(STORE_CLIENTE, visitorId, cliente);
}
