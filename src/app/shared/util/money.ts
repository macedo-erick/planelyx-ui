import { environment } from '../../../environments/environment';
import { Money } from '../models/common';
import { MinorAmount } from '../models/ingest';
import { amountsHidden } from './amount-visibility';
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

/** The digits stand in for any amount, so the mask never hints at how long the number was. */
const MASK = '••••';

/** The parts of a formatted amount that carry the figure, as opposed to symbol and spacing. */
const NUMERIC_PARTS = new Set<Intl.NumberFormatPartTypes>([
  'integer',
  'group',
  'decimal',
  'fraction',
]);

/**
 * The display path for an amount, masked to `R$ ••••` while `amountsHidden` is set.
 *
 * Reads `currentLocale()` and `amountsHidden()`, so every amount on screen reformats when the
 * language changes or the mask is toggled — templates calling this through a component method
 * re-run as a matter of course.
 *
 * Masking lives here rather than at the call sites so a newly displayed amount is concealed by
 * default; showing a real figure takes the deliberate step of reaching for `formatMoneyUnmasked`.
 */
export function formatMoney(value: Money, currency = environment.defaultCurrency): string {
  return amountsHidden() ? maskMoney(currency) : formatMoneyUnmasked(value, currency);
}

/**
 * The same formatting, never masked — for amounts the reader is editing rather than reading.
 *
 * A balance you are correcting or an installment preview of the figure you just typed has to
 * stay legible, or the field cannot be filled in. Reach for this only where the amount is part
 * of an input, and prefer `formatMoney` everywhere else.
 */
export function formatMoneyUnmasked(value: Money, currency = environment.defaultCurrency): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * The currency's own rendering of an amount with the figure replaced by dots.
 *
 * Built from `formatToParts` rather than by blanking digits out of a finished string, so symbol
 * placement and spacing stay whatever the locale does with them — `R$ ••••` in pt-BR, `$••••`
 * in en-US — without this function knowing the rule.
 */
function maskMoney(currency: string): string {
  const parts = new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency,
  }).formatToParts(0);

  let masked = false;

  return parts
    .map((part) => {
      if (!NUMERIC_PARTS.has(part.type)) {
        return part.value;
      }
      if (masked) {
        return '';
      }
      masked = true;
      return MASK;
    })
    .join('');
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
 *
 * Deliberately ignores `amountsHidden`: this formats the statement review's lines, and checking
 * an OCR reading against the printed total is exactly the task a mask would make impossible.
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
