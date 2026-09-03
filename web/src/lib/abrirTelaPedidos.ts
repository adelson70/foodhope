export function abrirTelaPedidosProntos() {
  const popup = window.open(
    `${window.location.origin}/painel/tela-pedidos`,
    'foodhope-tela-pedidos',
  );
  return Boolean(popup);
}
