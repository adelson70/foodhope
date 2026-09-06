const CHANNEL = 'foodhope-tela-pedidos';

export function avisarRefreshTelaPedidos() {
  try {
    const canal = new BroadcastChannel(CHANNEL);
    canal.postMessage({ type: 'refresh' });
    canal.close();
  } catch {
    return;
  }
}

export function ouvirRefreshTelaPedidos(onRefresh: () => void): () => void {
  try {
    const canal = new BroadcastChannel(CHANNEL);
    canal.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'refresh') onRefresh();
    };
    return () => {
      canal.close();
    };
  } catch {
    return () => undefined;
  }
}
