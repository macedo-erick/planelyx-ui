import { environment } from '../../../environments/environment';
import { Money } from '../models/common';
import { MinorAmount } from '../models/ingest';
import { currentLocale } from './locale';

/**
 * Money arrives as a JSON number with two decimal places. Repeated float addition can
 * drift (0.1 + 0.2), so every aggregate rounds back to cents.
 */

/** Rounds to 2 decimal places, correcting float representation error. */
export function roundCents(value: number): Money {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumMoney(values: Iterable<Money>): Money {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return roundCents(total);
}

/**
 * Reads `currentLocale()`, so every amount on screen reformats when the language changes —
 * templates calling this through a component method re-run as a matter of course.
 */
export function formatMoney(value: Money, currency = environment.defaultCurrency): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * How many minor units make one major unit of a currency, as an exponent.
 *
 * Read off `Intl` rather than assumed to be 2, because the OCR service handles international
 * purchases and a zero-decimal currency does exist: 1000 JPY is 1000, not 10.00. Hard-coding a
 * hundred would inflate every yen amount by 100x on screen.
 */
export function minorUnitDigits(currency: string): number {
  return (
    new Intl.NumberFormat(currentLocale(), { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/**
 * Formats an exact minor-unit amount for display.
 *
 * The division to a float happens here and nowhere else, at the last moment before the number
 * becomes text. Amounts stay integral everywhere they are compared, summed or sent back, which is
 * what keeps the reconciliation `planelyx-ocr` performs meaningful.
 */
export function formatMinor(amount: MinorAmount): string {
  const scale = 10 ** minorUnitDigits(amount.currency);

  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: amount.currency,
  }).format(amount.amountMinor / scale);
}

/**
 * Just the currency's symbol, for labelling a control whose value is the bare number.
 *
 * Read off `Intl` rather than mapped by hand so it follows the locale — `formatMinor` prints a
 * whole formatted amount, which is not what a control the reviewer types into can show.
 */
export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency,
  }).formatToParts(0);

  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

/** The major-unit value, for a control that edits an amount. Never for arithmetic. */
export function minorToMajor(amount: MinorAmount): Money {
  return amount.amountMinor / 10 ** minorUnitDigits(amount.currency);
}

/** The inverse, for handing an edited amount back as exact minor units. */
export function majorToMinor(value: Money, currency: string): MinorAmount {
  return {
    amountMinor: Math.round(value * 10 ** minorUnitDigits(currency)),
    currency,
  };
}

/**
 * Mirrors the backend's installment split: `total / count` rounded DOWN to cents for the
 * first n-1, with the remainder landing on the last one (100.00 / 3 -> 33.33, 33.33, 33.34).
 *
 * Used only to preview the split before submitting — the server does the real division.
 */
export function splitInstallments(total: Money, count: number): Money[] {
  if (count < 1) {
    return [];
  }
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? (baseCents + remainder) / 100 : baseCents / 100,
  );
}
