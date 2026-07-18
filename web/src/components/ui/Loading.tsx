import { cn } from '../../lib/cn';

type LoadingProps = {
  label?: string;
  fullScreen?: boolean;
  className?: string;
  dotClassName?: string;
};

export function Loading({
  label = 'Carregando',
  fullScreen = false,
  className,
  dotClassName,
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
      <span
        className={cn(
          'size-8 animate-pulse rounded-full bg-primary shadow-primary-glow',
          dotClassName,
        )}
      />
    </div>
  );
}
