import { useEffect, useRef } from 'react';

import { RECONECTOU_EVENT } from '../lib/conectividade';
import { useAppOffline } from './usePedidoOutboxSync';

export function useOnReconnect(onReconnect: () => void) {
  const offline = useAppOffline();
  const estavaOfflineRef = useRef(offline);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (estavaOfflineRef.current && !offline) {
      onReconnectRef.current();
    }
    estavaOfflineRef.current = offline;
  }, [offline]);

  useEffect(() => {
    function handle() {
      onReconnectRef.current();
    }
    window.addEventListener(RECONECTOU_EVENT, handle);
    return () => {
      window.removeEventListener(RECONECTOU_EVENT, handle);
    };
  }, []);
}
