import type { RoleOperador } from '../services/types';

export function rotaInicialPorRole(role: RoleOperador): string {
  if (role === 'TOTEM') return '/';
  if (role === 'OPERADOR') return '/painel/cardapio';
  return '/painel/dash';
}
