import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

type ConfigBackLinkProps = {
  to?: string;
};

export function ConfigBackLink({
  to = '/painel/configuracoes',
}: ConfigBackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 self-start text-body-md text-on-surface transition-colors hover:text-primary"
    >
      <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
      Voltar
    </Link>
  );
}
