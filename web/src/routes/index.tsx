import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MobileAppLayout } from '../components/layout/MobileLayout';
import { PainelLayout } from '../components/layout/PainelLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Importação das Páginas
import { Home } from '../pages/Home';
import { Cardapio } from '../pages/Painel/Cardapio';
import { Pedido } from '../pages/Painel/Pedido';
import { Config } from '../pages/Painel/Config';
import { Carrinho } from '../pages/Carrinho';
import { PedidoConfirmado } from '../pages/PedidoConfirmado';
import { Login } from '../pages/Login'; // <-- Não esqueça de criar essa página!
import { Dash } from '../pages/Painel/Dash';

export const router = createBrowserRouter([
  // ==========================================
  // ROTA PÚBLICA (Operador)
  // ==========================================
  { 
    path: '/login', 
    element: <Login /> 
  },

  // ==========================================
  // REFERENTE AO CLIENTE (Público)
  // ==========================================
  {
    path: '/',
    element: <MobileAppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: 'carrinho', element: <Carrinho /> },
      { path: 'confirmado', element: <PedidoConfirmado /> },
    ],
  },

  // ==========================================
  // REFERENTE AO OPERADOR (Protegido)
  // ==========================================
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
          { path: 'pedido', element: <Pedido /> },
          { path: 'configuracoes', element: <Config /> },
        ],
      }
    ],
  },
]);