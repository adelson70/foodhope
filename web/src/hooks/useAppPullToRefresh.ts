import { useCallback, type RefObject } from 'react';

import { flushPedidoOutbox } from './usePedidoOutboxSync';
import {
  emitPullRefresh,
  usePullToRefresh,
  type PullToRefreshState,
} from './usePullToRefresh';
import { liberarRetryApi } from '../lib/conectividade';
import { getToken } from '../services/cookie';
import { queryClient } from '../services/queryClient';

export function useAppPullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  enabled = true,
): PullToRefreshState {
  const onRefresh = useCallback(async () => {
    liberarRetryApi();
    if (getToken()) {
      await flushPedidoOutbox();
    }
    emitPullRefresh();
    await queryClient.invalidateQueries();
  }, []);

  return usePullToRefresh(scrollRef, { onRefresh, enabled });
}
