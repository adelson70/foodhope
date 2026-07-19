import { useOutletContext } from 'react-router-dom';

import type { Operador, RoleOperador } from '../services/types';

export type SessaoContext = {
  operador: Operador;
  role: RoleOperador;
};

export function useSessao(): SessaoContext {
  return useOutletContext<SessaoContext>();
}
