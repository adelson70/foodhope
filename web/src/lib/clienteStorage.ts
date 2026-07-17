import {
  idbDelete,
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

export const LOCAL_DATA_KEY = 'current';
const PEDIDOS_CAP = 50;

type CarrinhoRecord = {
  itens: CarrinhoItem[];
};

async function migrateLegacyKey(
  storeName: string,
  legacyVisitorId?: string | null,
): Promise<void> {
  const current = await idbGet(storeName, LOCAL_DATA_KEY);
  if (current !== undefined) return;
  if (!legacyVisitorId) return;

  const legacy = await idbGet(storeName, legacyVisitorId);
  if (legacy === undefined) return;

  await idbPut(storeName, LOCAL_DATA_KEY, legacy);
  try {
    await idbDelete(storeName, legacyVisitorId);
  } catch {
    return;
  }
}

export async function loadCarrinho(
  legacyVisitorId?: string | null,
): Promise<CarrinhoItem[]> {
  await migrateLegacyKey(STORE_CARRINHO, legacyVisitorId);
  const record = await idbGet<CarrinhoRecord>(STORE_CARRINHO, LOCAL_DATA_KEY);
  return record?.itens ?? [];
}

export async function saveCarrinho(itens: CarrinhoItem[]): Promise<void> {
  await idbPut(STORE_CARRINHO, LOCAL_DATA_KEY, { itens });
}

export async function loadPedidosLocais(
  legacyVisitorId?: string | null,
): Promise<PedidoLocal[]> {
  await migrateLegacyKey(STORE_PEDIDOS, legacyVisitorId);
  const list = await idbGet<PedidoLocal[]>(STORE_PEDIDOS, LOCAL_DATA_KEY);
  return list ?? [];
}

export async function appendPedidoLocal(
  pedido: PedidoLocal,
): Promise<void> {
  const atual = await loadPedidosLocais();
  const next = [pedido, ...atual.filter((item) => item.id !== pedido.id)].slice(
    0,
    PEDIDOS_CAP,
  );
  await idbPut(STORE_PEDIDOS, LOCAL_DATA_KEY, next);
}

export async function loadClienteLocal(
  legacyVisitorId?: string | null,
): Promise<ClienteLocal | null> {
  await migrateLegacyKey(STORE_CLIENTE, legacyVisitorId);
  const perfil = await idbGet<ClienteLocal>(STORE_CLIENTE, LOCAL_DATA_KEY);
  if (!perfil?.primeiro_nome) {
    return null;
  }
  return {
    primeiro_nome: perfil.primeiro_nome,
    sobrenome: perfil.sobrenome ?? '',
    contato: perfil.contato ?? '',
    cidade: perfil.cidade ?? '',
  };
}

export async function saveClienteLocal(cliente: ClienteLocal): Promise<void> {
  await idbPut(STORE_CLIENTE, LOCAL_DATA_KEY, cliente);
}
