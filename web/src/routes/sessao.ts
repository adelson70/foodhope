import { useOutletContext } from 'react-router-dom';

import type { Operador, RoleOperador } from '../services/types';

export type SessaoContext = {
  operador: Operador;
  role: RoleOperador;
  offline?: boolean;
};

export function useSessao(): SessaoContext {
  return useOutletContext<SessaoContext>();
}
