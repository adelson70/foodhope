import {
  forwardRef,
  type ClipboardEvent,
  type FocusEventHandler,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';

import { cn } from '../../lib/cn';
import {
  centsToNumber,
  digitsToCents,
  formatBrlFromCents,
  numberToCents,
  onlyDigits,
} from '../../lib/currency';

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: number;
  onChange: (value: number) => void;
  error?: boolean;
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      value,
      onChange,
      error = false,
      disabled,
      onBlur,
      onFocus,
      id,
      name,
      ...props
    },
    ref,
  ) => {
    const cents = numberToCents(value ?? 0);
    const display = formatBrlFromCents(cents);

    function applyDigits(digits: string) {
      onChange(centsToNumber(digitsToCents(digits)));
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (disabled) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        const base = cents === 0 ? '' : String(cents);
        applyDigits(base + event.key);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        applyDigits(String(cents).slice(0, -1));
      }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
      event.preventDefault();
      if (disabled) return;
      applyDigits(onlyDigits(event.clipboardData.getData('text')));
    }

    const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
      event.target.select();
      onFocus?.(event);
    };

    return (
      <div
        className={cn(
          'input-focus-ring flex w-full items-center gap-2 rounded-xl border bg-operator-bg px-4 py-3 transition-all duration-200',
          error ? 'border-danger' : 'border-operator-border',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="shrink-0 text-body-md text-on-surface-variant">
          R$
        </span>
        <input
          ref={ref}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={display}
          onBlur={onBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onChange={(event) => {
            applyDigits(onlyDigits(event.target.value));
          }}
          className={cn(
            'w-full border-none bg-transparent text-right text-body-md text-on-surface outline-none',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

CurrencyInput.displayName = 'CurrencyInput';
