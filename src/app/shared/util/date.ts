import { IsoDate, MonthKey } from '../models/common';

/** Conversions between the API's `LocalDate` strings and JS `Date` objects. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `Date` -> `"YYYY-MM-DD"`, using the local calendar day. */
export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `"YYYY-MM-DD"` -> local-midnight `Date`. Returns null for anything malformed. */
export function fromIsoDate(value: IsoDate | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Today as an `IsoDate`, in the user's timezone. */
export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

/** First day of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** `Date` -> `"YYYY-MM"`, the form the API uses for a month. Local calendar, so it never drifts. */
export function toMonthKey(date: Date): MonthKey {
  return toIsoDate(date).slice(0, 7);
}

/** `"YYYY-MM"` -> local-midnight `Date` on the first of that month. Null for anything malformed. */
export function fromMonthKey(value: MonthKey | null | undefined): Date | null {
  return value ? fromIsoDate(`${value}-01`) : null;
}

/** Last day of the month containing `date`. Day 0 of the next month is the trick. */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Inclusive `{ from, to }` covering the current calendar month. */
export function currentMonthRange(): { from: IsoDate; to: IsoDate } {
  const now = new Date();
  return { from: toIsoDate(startOfMonth(now)), to: toIsoDate(endOfMonth(now)) };
}

/** True when `iso` falls in the same calendar month as `reference` (default: today). */
export function isSameMonth(iso: IsoDate, reference: Date = new Date()): boolean {
  const date = fromIsoDate(iso);
  return (
    date !== null &&
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

/** Whole days from today until `iso`. */
export function daysUntil(iso: IsoDate, reference: Date = new Date()): number | null {
  const target = fromIsoDate(iso);
  if (!target) {
    return null;
  }
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
