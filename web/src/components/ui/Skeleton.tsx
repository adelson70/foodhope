import { type HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-on-surface/10', className)}
      {...props}
    />
  );
}
