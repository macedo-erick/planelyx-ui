import { describe, expect, it } from 'vitest';

import {
  currentMonthRange,
  daysUntil,
  endOfMonth,
  fromIsoDate,
  isSameMonth,
  startOfMonth,
  todayIso,
  toIsoDate,
} from './date';

describe('date utils', () => {
  describe('fromIsoDate', () => {
    it('parses to local midnight, not UTC midnight', () => {
      const date = fromIsoDate('2026-08-03');

      expect(date).not.toBeNull();

      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(7);
      expect(date!.getDate()).toBe(3);
      expect(date!.getHours()).toBe(0);
    });

    it('returns null for malformed or empty input', () => {
      expect(fromIsoDate(null)).toBeNull();
      expect(fromIsoDate(undefined)).toBeNull();
      expect(fromIsoDate('')).toBeNull();
      expect(fromIsoDate('03/08/2026')).toBeNull();
      expect(fromIsoDate('2026-8-3')).toBeNull();
      expect(fromIsoDate('2026-08-03T00:00:00Z')).toBeNull();
    });
  });

  describe('toIsoDate', () => {
    it('formats from local date parts', () => {
      expect(toIsoDate(new Date(2026, 7, 3))).toBe('2026-08-03');
    });

    it('zero-pads single-digit months and days', () => {
      expect(toIsoDate(new Date(2026, 0, 9))).toBe('2026-01-09');
    });

    it('does not shift a date late in the local day', () => {
      expect(toIsoDate(new Date(2026, 7, 3, 23, 30))).toBe('2026-08-03');
    });
  });

  it('round-trips without drifting a day', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2026-06-15', '2026-12-31']) {
      expect(toIsoDate(fromIsoDate(iso)!)).toBe(iso);
    }
  });

  describe('month helpers', () => {
    it('startOfMonth returns the first day', () => {
      expect(toIsoDate(startOfMonth(new Date(2026, 7, 17)))).toBe('2026-08-01');
    });

    it('endOfMonth returns the last day, including short months', () => {
      expect(toIsoDate(endOfMonth(new Date(2026, 7, 17)))).toBe('2026-08-31');
      expect(toIsoDate(endOfMonth(new Date(2026, 1, 5)))).toBe('2026-02-28');

      expect(toIsoDate(endOfMonth(new Date(2028, 1, 5)))).toBe('2028-02-29');
    });

    it('currentMonthRange spans first to last day of this month', () => {
      const { from, to } = currentMonthRange();
      const now = new Date();

      expect(from).toBe(toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      expect(to).toBe(toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
      expect(from <= todayIso() && todayIso() <= to).toBe(true);
    });

    it('isSameMonth compares year and month only', () => {
      const reference = new Date(2026, 7, 15);

      expect(isSameMonth('2026-08-01', reference)).toBe(true);
      expect(isSameMonth('2026-08-31', reference)).toBe(true);
      expect(isSameMonth('2026-09-01', reference)).toBe(false);
      expect(isSameMonth('2025-08-15', reference)).toBe(false);
      expect(isSameMonth('nonsense', reference)).toBe(false);
    });
  });

  describe('daysUntil', () => {
    const reference = new Date(2026, 7, 3, 14, 30);

    it('counts whole days forward and backward', () => {
      expect(daysUntil('2026-08-03', reference)).toBe(0);
      expect(daysUntil('2026-08-04', reference)).toBe(1);
      expect(daysUntil('2026-08-10', reference)).toBe(7);
      expect(daysUntil('2026-08-01', reference)).toBe(-2);
    });

    it('ignores the time of day on the reference', () => {
      expect(daysUntil('2026-08-04', new Date(2026, 7, 3, 23, 59))).toBe(1);
      expect(daysUntil('2026-08-04', new Date(2026, 7, 3, 0, 1))).toBe(1);
    });

    it('returns null for a malformed date', () => {
      expect(daysUntil('not-a-date', reference)).toBeNull();
    });
  });
});
