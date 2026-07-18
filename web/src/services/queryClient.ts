import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'foodhope-rq',
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: 1000 * 60 * 60 * 24,
  buster: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) &&
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'cardapio',
  },
};
