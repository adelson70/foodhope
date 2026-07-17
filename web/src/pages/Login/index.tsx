import { Link, Navigate } from 'react-router-dom';

import { FoodHopeLogo } from '../../components/brand/FoodHopeLogo';
import { getToken } from '../../services';
import { LoginForm } from './LoginForm';

export function Login() {
  if (getToken()) {
    return <Navigate to="/painel" replace />;
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,color-mix(in_srgb,var(--color-primary-container)_6%,transparent)_0%,transparent_50%)]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <div className="space-y-2 text-center">
          <FoodHopeLogo
            className="justify-center"
            markClassName="size-10"
          />
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight text-on-surface">
            Área Operacional
          </h1>
          <p className="text-subtitle-md text-on-surface-variant">
            Acesse para administrar o cardápio e pedidos
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-caption text-on-surface-variant">
          <Link
            to="/termos"
            className="text-primary underline-offset-2 hover:underline"
          >
            Termos de Uso
          </Link>
          {' · '}
          <Link
            to="/privacidade"
            className="text-primary underline-offset-2 hover:underline"
          >
            Política de Privacidade
          </Link>
        </p>
      </div>
    </main>
  );
}
