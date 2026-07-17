import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';

import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, leftIcon, rightIcon, error, disabled, ...props },
    ref,
  ) => {
    return (
      <div
        className={cn(
          'input-focus-ring flex w-full items-center gap-2 rounded-xl border bg-surface-container-low px-4 py-3 transition-all duration-200',
          error ? 'border-danger' : 'border-outline-variant/50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {leftIcon ? (
          <span className="shrink-0 text-on-surface-variant">{leftIcon}</span>
        ) : null}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full bg-transparent border-none outline-none text-on-surface text-body-md placeholder:text-outline/50',
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <span className="shrink-0 text-on-surface-variant">{rightIcon}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
