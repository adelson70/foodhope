import { Navigate } from 'react-router-dom';

import { rotaInicialPorRole } from '../lib/rotaPorRole';
import { useSessao } from './sessao';

export function PainelHomeRedirect() {
  const { role } = useSessao();
  return <Navigate to={rotaInicialPorRole(role)} replace />;
}
