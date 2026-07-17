import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../lib/cn';

const variants = {
  primary:
    'bg-primary-container text-on-primary hover:bg-primary shadow-primary-glow',
  secondary:
    'bg-on-surface/5 text-on-surface border border-operator-border hover:bg-on-surface/10',
  ghost: 'bg-transparent text-primary hover:bg-primary/5',
  danger: 'bg-danger text-customer-bg hover:bg-danger/80',
  success: 'bg-success text-surface hover:bg-success/80',
  info: 'bg-tertiary-container text-tertiary-900 hover:bg-tertiary-500',
  icon: 'bg-primary-container text-on-primary hover:scale-105 size-12 p-0',
} as const;

type ButtonVariant = keyof typeof variants;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      fullWidth = false,
      disabled,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-medium text-subtitle-md py-3 px-8 transition-all duration-200 active:scale-[0.98]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variants[variant],
          fullWidth && 'w-full',
          variant === 'icon' && 'py-0 px-0',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
