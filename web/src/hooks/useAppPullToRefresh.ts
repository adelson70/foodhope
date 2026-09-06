import { useCallback, type RefObject } from 'react';

import { flushPedidoOutbox } from './usePedidoOutboxSync';
import {
  emitPullRefresh,
  usePullToRefresh,
  type PullToRefreshState,
} from './usePullToRefresh';
import { getToken } from '../services/cookie';
import { queryClient } from '../services/queryClient';

export function useAppPullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  enabled = true,
): PullToRefreshState {
  const onRefresh = useCallback(async () => {
    if (getToken()) {
      await flushPedidoOutbox();
    }
    emitPullRefresh();
    await queryClient.invalidateQueries();
  }, []);

  return usePullToRefresh(scrollRef, { onRefresh, enabled });
}
