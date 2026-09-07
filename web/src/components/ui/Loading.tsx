import { FoodHopeMark } from '../brand/FoodHopeLogo';
import { cn } from '../../lib/cn';

type LoadingProps = {
  label?: string;
  fullScreen?: boolean;
  className?: string;
  markClassName?: string;
};

export function Loading({
  label = 'Carregando',
  fullScreen = false,
  className,
  markClassName,
}: LoadingProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen ? 'min-h-dvh' : 'w-full py-8',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="loading-logo text-primary">
        <FoodHopeMark
          className={cn(fullScreen ? 'size-16' : 'size-12', markClassName)}
        />
      </span>
    </div>
  );
}
