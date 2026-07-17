import { type TextareaHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../lib/cn';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, rows = 5, ...props }, ref) => {
    return (
      <div
        className={cn(
          'input-focus-ring flex w-full rounded-xl border bg-operator-bg px-4 py-3 transition-all duration-200',
          error ? 'border-danger' : 'border-operator-border',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <textarea
          ref={ref}
          disabled={disabled}
          rows={rows}
          className={cn(
            'w-full resize-none border-none bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline/50',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
