import { useQuery } from '@tanstack/react-query';

import { cozinhaService } from '../services';

export const COZINHA_STATUS_KEY = ['cozinha', 'status'] as const;

export function useCozinhaStatus() {
  const query = useQuery({
    queryKey: COZINHA_STATUS_KEY,
    queryFn: async () => {
      const response = await cozinhaService.obter();
      if (!response.sucesso || !response.dados) {
        throw new Error(
          response.mensagens[0] ?? 'Não foi possível carregar o status da loja.',
        );
      }
      return response.dados;
    },
  });

  return {
    ativa: query.data?.ativa ?? true,
    loading: query.isLoading,
    erro: query.isError,
  };
}
