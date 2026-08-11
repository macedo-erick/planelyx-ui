import { IsoDate, IsoInstant } from '../models/common';
import { fromIsoDate } from './date';
import { currentLocale } from './locale';

/** Locale-aware date display, kept apart from `date.ts`. */

/** e.g. "03 Aug" / "03 de ago." — for dense rows where the year is implied. */
export function shortDate(iso: IsoDate): string {
  return format(iso, { day: '2-digit', month: 'short' });
}

/** e.g. "03 Aug 2026" — for dates far enough out that the year matters. */
export function longDate(iso: IsoDate): string {
  return format(iso, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** e.g. "August 2026" — month headings and the month navigator. */
export function monthYear(date: Date, style: 'short' | 'long' = 'long'): string {
  return date.toLocaleDateString(currentLocale(), { month: style, year: 'numeric' });
}

/** Date and time together, for audit-style values such as when an invoice was paid. */
export function dateTime(value: IsoInstant): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(currentLocale());
}

/** The order a date picker should present, which differs between the two locales. */
export function datePickerFormat(): string {
  return currentLocale() === 'en-US' ? 'mm/dd/yy' : 'dd/mm/yy';
}

function format(iso: IsoDate, options: Intl.DateTimeFormatOptions): string {
  const date = fromIsoDate(iso);
  return date ? date.toLocaleDateString(currentLocale(), options) : iso;
}
