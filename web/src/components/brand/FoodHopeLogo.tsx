import { cn } from '../../lib/cn';

type FoodHopeMarkProps = {
  className?: string;
  title?: string;
};

export function FoodHopeMark({ className, title }: FoodHopeMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M50 11.5A38.5 38.5 0 1 1 11.5 50"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="butt"
      />
      <g fill="currentColor" transform="translate(5.5 0.8)">
        <rect x="24.5" y="30" width="10" height="40" />
        <rect x="45.5" y="30" width="10" height="40" />
        <rect x="34.5" y="48" width="21" height="10" />
        <path d="M55.5 30a14.25 14.25 0 0 1 0 28.5V52a7.75 7.75 0 0 0 0-15.5V30z" />
      </g>
    </svg>
  );
}

type FoodHopeLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

export function FoodHopeLogo({
  className,
  markClassName,
  wordmarkClassName,
}: FoodHopeLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="Food Hope">
      <FoodHopeMark className={cn('size-9 text-primary-container', markClassName)} />
      <span
        className={cn(
          'text-label-sm uppercase tracking-[0.28em] text-primary-container',
          wordmarkClassName,
        )}
      >
        Food Hope
      </span>
    </div>
  );
}
