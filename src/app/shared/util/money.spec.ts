import { describe, expect, it } from 'vitest';

import { roundCents, splitInstallments, sumMoney } from './money';

describe('money utils', () => {
  describe('roundCents', () => {
    it('corrects float representation error', () => {
      expect(roundCents(0.1 + 0.2)).toBe(0.3);
      expect(roundCents(1.005)).toBe(1.01);
    });

    it('leaves exact values alone', () => {
      expect(roundCents(33.33)).toBe(33.33);
      expect(roundCents(0)).toBe(0);
    });
  });

  describe('sumMoney', () => {
    it('does not accumulate float drift', () => {
      expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
      expect(sumMoney([33.33, 33.33, 33.34])).toBe(100);
    });

    it('handles an empty list', () => {
      expect(sumMoney([])).toBe(0);
    });
  });

  describe('splitInstallments', () => {
    it('mirrors the API: round down, remainder on the last', () => {
      expect(splitInstallments(100, 3)).toEqual([33.33, 33.33, 33.34]);
    });

    it('splits evenly when it divides cleanly', () => {
      expect(splitInstallments(120, 4)).toEqual([30, 30, 30, 30]);
    });

    it('always sums back to the original total', () => {
      for (const [total, count] of [
        [100, 3],
        [99.99, 7],
        [1250.5, 12],
        [0.05, 2],
      ] as const) {
        expect(sumMoney(splitInstallments(total, count))).toBe(total);
      }
    });

    it('returns an empty array for a non-positive count', () => {
      expect(splitInstallments(100, 0)).toEqual([]);
      expect(splitInstallments(100, -1)).toEqual([]);
    });
  });
});
