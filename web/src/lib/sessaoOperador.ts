import {
  idbDelete,
  idbGet,
  idbPut,
  STORE_SESSAO_OPERADOR,
} from './clientIdb';
import type { Operador } from '../services/types';

const SESSAO_KEY = 'current';

export type SessaoOperadorCache = Pick<
  Operador,
  'id' | 'nome' | 'role' | 'ativo'
> & {
  cachedAt: string;
};

export async function salvarSessaoOperador(
  operador: Operador,
): Promise<void> {
  const value: SessaoOperadorCache = {
    id: operador.id,
    nome: operador.nome,
    role: operador.role,
    ativo: operador.ativo,
    cachedAt: new Date().toISOString(),
  };
  await idbPut(STORE_SESSAO_OPERADOR, SESSAO_KEY, value);
}

export async function obterSessaoOperador(): Promise<
  SessaoOperadorCache | undefined
> {
  return idbGet<SessaoOperadorCache>(STORE_SESSAO_OPERADOR, SESSAO_KEY);
}

export async function limparSessaoOperador(): Promise<void> {
  await idbDelete(STORE_SESSAO_OPERADOR, SESSAO_KEY);
}
