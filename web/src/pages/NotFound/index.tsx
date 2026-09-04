import { Link } from 'react-router-dom';

import { FoodHopeLogo } from '../../components/brand/FoodHopeLogo';
import { Button } from '../../components/ui/Button';

export function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,color-mix(in_srgb,var(--color-primary-container)_6%,transparent)_0%,transparent_50%)]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <FoodHopeLogo
          className="justify-center"
          markClassName="size-10"
        />

        <div className="space-y-2">
          <p className="text-display font-semibold tracking-tight text-primary">
            404
          </p>
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight text-on-surface">
            Página não encontrada
          </h1>
          <p className="text-subtitle-md text-on-surface-variant">
            Esse endereço não existe ou foi movido. Volte ao cardápio para
            continuar.
          </p>
        </div>

        <Link to="/" className="w-full">
          <Button type="button" fullWidth>
            Voltar ao cardápio
          </Button>
        </Link>
      </div>
    </main>
  );
}
