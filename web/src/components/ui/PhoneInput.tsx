import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
} from 'react';

import { cn } from '../../lib/cn';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
} from '../../lib/countries';
import {
  detectPhoneCountry,
  formatNationalNumber,
  getCountryByIso,
  onlyDigits,
  stripDialCode,
  toContato,
} from '../../lib/phone';
import { Select } from './Select';
import type { SelectOption } from './select.utils';

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      value,
      onChange,
      error = false,
      disabled,
      onBlur,
      id,
      name,
      ...props
    },
    ref,
  ) => {
    const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
    const country = getCountryByIso(countryIso);

    useEffect(() => {
      if (!value) return;
      setCountryIso(detectPhoneCountry(value).iso);
    }, [value]);

    const countryOptions = useMemo<SelectOption[]>(
      () =>
        PHONE_COUNTRIES.map((item) => ({
          value: item.iso,
          label: `${item.flag} ${item.name}`,
          description: `+${item.dialCode}`,
          triggerLabel: `${item.flag} +${item.dialCode}`,
        })),
      [],
    );

    const national = stripDialCode(value, country.dialCode).slice(
      0,
      country.nationalMax,
    );
    const display = formatNationalNumber(country, national);
    const placeholder =
      country.iso === 'BR' ? '(00) 00000-0000' : '000 000 000';

    function handleCountryChange(iso: string) {
      if (!iso) {
        const nacional = stripDialCode(value, country.dialCode).slice(
          0,
          DEFAULT_PHONE_COUNTRY.nationalMax,
        );
        setCountryIso(DEFAULT_PHONE_COUNTRY.iso);
        onChange(toContato(DEFAULT_PHONE_COUNTRY.dialCode, nacional));
        return;
      }

      const next = getCountryByIso(iso);
      const nacional = stripDialCode(value, country.dialCode).slice(
        0,
        next.nationalMax,
      );
      setCountryIso(iso);
      onChange(toContato(next.dialCode, nacional));
    }

    return (
      <div
        className={cn(
          'input-focus-ring flex w-full items-center gap-2 rounded-xl border bg-operator-bg py-1.5 pr-3 pl-1.5 transition-all duration-200',
          error ? 'border-danger' : 'border-operator-border',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Select
          value={countryIso}
          onChange={handleCountryChange}
          options={countryOptions}
          disabled={disabled}
          clearable
          fullWidth={false}
          placeholder="🇧🇷 +55"
          searchPlaceholder="Buscar país ou DDI…"
          emptyMessage="Nenhum país encontrado"
          className="shrink-0 border-0 bg-transparent px-2 py-1.5 shadow-none"
        />
        <span className="h-6 w-px shrink-0 bg-operator-border" aria-hidden="true" />
        <input
          ref={ref}
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          placeholder={placeholder}
          value={display}
          onBlur={onBlur}
          onChange={(event) => {
            const nacional = onlyDigits(event.target.value).slice(
              0,
              country.nationalMax,
            );
            onChange(toContato(country.dialCode, nacional));
          }}
          className={cn(
            'w-full bg-transparent border-none outline-none text-on-surface text-body-md placeholder:text-outline/50',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';
