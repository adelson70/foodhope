import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type LegalDocLayoutProps = {
  title: string;
  relatedTo: string;
  relatedLabel: string;
  children: ReactNode;
};

export function LegalDocLayout({
  title,
  relatedTo,
  relatedLabel,
  children,
}: LegalDocLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 self-start text-body-md text-on-surface transition-colors hover:text-primary"
      >
        <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
        Voltar
      </button>

      <h1 className="text-title-md text-on-surface">{title}</h1>

      <div className="flex flex-col gap-6 text-body-md text-on-surface-variant">
        {children}
      </div>

      <p className="text-caption text-on-surface-variant">
        Veja também:{' '}
        <Link
          to={relatedTo}
          className="text-primary underline-offset-2 hover:underline"
        >
          {relatedLabel}
        </Link>
      </p>
    </div>
  );
}

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-subtitle-md text-on-surface">{title}</h2>
      {children}
    </section>
  );
}
