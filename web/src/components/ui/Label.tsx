import { type LabelHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'block text-label-sm text-on-surface-variant uppercase tracking-widest',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
