import { environment } from '../../../environments/environment';
import { Money } from '../models/common';
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
