import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MobileAppLayout } from '../components/layout/MobileLayout';
import { PainelLayout } from '../components/layout/PainelLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { Home } from '../pages/Home';
import { Cardapio } from '../pages/Painel/Cardapio';
import { Pedidos } from '../pages/Painel/Pedidos';
import { Config } from '../pages/Painel/Config';
import { Carrinho } from '../pages/Carrinho';
import { PedidoConfirmado } from '../pages/PedidoConfirmado';
import { PedidosCliente } from '../pages/PedidosCliente';
import { Login } from '../pages/Login';
import { Dash } from '../pages/Painel/Dash';

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
    ],
  },
  {
    path: '/painel',
    element: <ProtectedRoute />,
    children: [
      {
        element: <PainelLayout />,
        children: [
          { index: true, element: <Navigate to="dash" replace /> },
          { path: 'dash', element: <Dash /> },
          { path: 'cardapio', element: <Cardapio /> },
          { path: 'pedido', element: <Pedidos /> },
          { path: 'configuracoes', element: <Config /> },
        ],
      },
    ],
  },
]);
