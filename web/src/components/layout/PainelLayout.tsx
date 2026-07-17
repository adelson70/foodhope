import { Outlet, Link } from 'react-router-dom';

export function PainelLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary-900 text-white">
      <header className="bg-secondary-500 p-4 shadow-md flex justify-between items-center">
        <h1 className="text-headline text-primary-500">Painel Food Hope</h1>
        <nav className="flex gap-4 text-label">
          <Link to="/painel/dash" className="hover:text-primary-400">Dash</Link>
          <Link to="/painel/cardapio" className="hover:text-primary-400">Cardápio</Link>
          <Link to="/painel/pedido" className="hover:text-primary-400">Pedidos</Link>
          <Link to="/painel/configuracoes" className="hover:text-primary-400">Config</Link>
        </nav>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}