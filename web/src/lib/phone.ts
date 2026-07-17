import {
  DEFAULT_PHONE_COUNTRY,
  findPhoneCountry,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from './countries';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function detectPhoneCountry(value: string): PhoneCountry {
  const digits = onlyDigits(value);
  if (!digits) return DEFAULT_PHONE_COUNTRY;

  const sorted = [...PHONE_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );

  for (const country of sorted) {
    if (digits.startsWith(country.dialCode)) {
      return country;
    }
  }

  return DEFAULT_PHONE_COUNTRY;
}

export function stripDialCode(value: string, dialCode: string): string {
  const digits = onlyDigits(value);
  if (digits.startsWith(dialCode)) {
    return digits.slice(dialCode.length);
  }
  return digits;
}

export function toContato(dialCode: string, nationalDigits: string): string {
  const nacional = onlyDigits(nationalDigits);
  if (!nacional) return '';
  return `${onlyDigits(dialCode)}${nacional}`;
}

export function formatNationalNumber(
  country: PhoneCountry,
  nationalDigits: string,
): string {
  const d = onlyDigits(nationalDigits).slice(0, country.nationalMax);

  if (country.iso === 'BR') {
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) {
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    }
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 10) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)} ${d.slice(10)}`;
}

export function isValidContato(value: string): boolean {
  return /^\d{11,15}$/.test(onlyDigits(value));
}

export function getCountryByIso(iso: string): PhoneCountry {
  return findPhoneCountry(iso);
}
