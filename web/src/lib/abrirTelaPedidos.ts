import { telaPedidosService } from '../services';

export async function abrirTelaPedidosProntos(): Promise<boolean> {
  const response = await telaPedidosService.obter();
  const urlPath = response.dados?.urlPath;
  if (!response.sucesso || !urlPath) {
    return false;
  }

  const popup = window.open(
    `${window.location.origin}${urlPath}`,
    'foodhope-tela-pedidos',
  );
  return Boolean(popup);
}

export function urlTelaPedidosCompleta(urlPath: string) {
  return `${window.location.origin}${urlPath}`;
}
