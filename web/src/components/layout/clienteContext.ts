import { useOutletContext } from 'react-router-dom';

export type ClienteContext = {
  isTotem: boolean;
};

export function useClienteContext(): ClienteContext {
  return useOutletContext<ClienteContext>();
}
