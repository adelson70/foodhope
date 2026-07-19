import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MobileAppLayout } from '../components/layout/MobileLayout';
import { PainelLayout } from '../components/layout/PainelLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { Home } from '../pages/Home';
import { Cardapio } from '../pages/Painel/Cardapio';
import { Pedidos } from '../pages/Painel/Pedidos';
import { Config } from '../pages/Painel/Config';
import { ConfigCozinha } from '../pages/Painel/Config/ConfigCozinha';
import { ConfigCozinhaAdicionais } from '../pages/Painel/Config/ConfigCozinhaAdicionais';
import { ConfigCozinhaCategorias } from '../pages/Painel/Config/ConfigCozinhaCategorias';
import { Carrinho } from '../pages/Carrinho';
import { PedidoConfirmado } from '../pages/PedidoConfirmado';
import { PedidosCliente } from '../pages/PedidosCliente';
import { Privacidade } from '../pages/Privacidade';
import { Termos } from '../pages/Termos';
import { Login } from '../pages/Login';
import { Dash } from '../pages/Painel/Dash';
import { Relatorio } from '../pages/Painel/Relatorio';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <MobileAppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: 'pedidos', element: <PedidosCliente /> },
      { path: 'carrinho', element: <Carrinho /> },
      { path: 'confirmado', element: <PedidoConfirmado /> },
      { path: 'privacidade', element: <Privacidade /> },
      { path: 'termos', element: <Termos /> },
    ],
  },
  {
    path: '/painel',
    element: <ProtectedRoute />,
    children: [
      {
        path: 'relatorio',
        element: <Relatorio />,
      },
      {
        element: <PainelLayout />,
        children: [
          { index: true, element: <Navigate to="dash" replace /> },
          { path: 'dash', element: <Dash /> },
          { path: 'cardapio', element: <Cardapio /> },
          { path: 'pedido', element: <Pedidos /> },
          { path: 'configuracoes', element: <Config /> },
          { path: 'configuracoes/cozinha', element: <ConfigCozinha /> },
          {
            path: 'configuracoes/cozinha/adicionais',
            element: <ConfigCozinhaAdicionais />,
          },
          {
            path: 'configuracoes/cozinha/categorias',
            element: <ConfigCozinhaCategorias />,
          },
        ],
      },
    ],
  },
]);
