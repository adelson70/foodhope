import { Navigate, Outlet } from 'react-router-dom';

import { rotaInicialPorRole } from '../lib/rotaPorRole';
import type { RoleOperador } from '../services/types';
import { useSessao } from './sessao';

type RequireRoleProps = {
  allow: RoleOperador[];
};

export function RequireRole({ allow }: RequireRoleProps) {
  const { operador } = useSessao();

  if (!allow.includes(operador.role)) {
    return <Navigate to={rotaInicialPorRole(operador.role)} replace />;
  }

  return <Outlet context={{ operador, role: operador.role }} />;
}
