import { environment } from '../../../environments/environment';
import { Money } from '../models/common';
import { MinorAmount } from '../models/ingest';
import { amountsHidden } from './amount-visibility';
import { currentLocale } from './locale';

/** Money arrives as a JSON number with two decimal places. */

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

/** The display path for an amount, masked to `R$ ••••` while `amountsHidden` is set. */
export function formatMoney(value: Money, currency = environment.defaultCurrency): string {
  return amountsHidden() ? maskMoney(currency) : formatMoneyUnmasked(value, currency);
}

/** The same formatting, never masked — for amounts the reader is editing rather than reading. */
export function formatMoneyUnmasked(value: Money, currency = environment.defaultCurrency): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency,
  }).format(value);
}

/** The currency's own rendering of an amount with the figure replaced by dots. */
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

/** How many minor units make one major unit of a currency, as an exponent. */
export function minorUnitDigits(currency: string): number {
  return (
    new Intl.NumberFormat(currentLocale(), { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/** Formats an exact minor-unit amount for display. */
export function formatMinor(amount: MinorAmount): string {
  const scale = 10 ** minorUnitDigits(amount.currency);

  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: amount.currency,
  }).format(amount.amountMinor / scale);
}

/** Just the currency's symbol, for labelling a control whose value is the bare number. */
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

/** Mirrors the backend's installment split: the remainder lands on the last one. */
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
