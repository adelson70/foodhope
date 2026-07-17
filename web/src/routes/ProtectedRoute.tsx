import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  const token = localStorage.getItem('token');

  if (!token) {
    console.log(("não autorizado, enviando para rota home"))
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}