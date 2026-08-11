import { afterEach, describe, expect, it } from 'vitest';

import { amountsHidden } from './amount-visibility';
import { currentLocale } from './locale';
import {
  currencySymbol,
  formatMinor,
  formatMoney,
  formatMoneyUnmasked,
  roundCents,
  splitInstallments,
  sumMoney,
} from './money';

describe('money utils', () => {
  describe('formatMoney', () => {
    const original = currentLocale();

    afterEach(() => currentLocale.set(original));

    it('follows the active locale', () => {
      currentLocale.set('pt-BR');
      const brazilian = formatMoney(1234.56, 'BRL');

      currentLocale.set('en-US');
      const american = formatMoney(1234.56, 'USD');

      expect(brazilian).toContain('1.234,56');
      expect(american).toContain('1,234.56');
    });

    it('formats the currency it is given, not the locale default', () => {
      currentLocale.set('pt-BR');

      expect(formatMoney(10, 'USD')).toContain('US$');
    });
  });

  describe('hiding amounts', () => {
    const originalLocale = currentLocale();

    const normalise = (value: string) => value.replace(/\u00A0/g, ' ');

    afterEach(() => {
      currentLocale.set(originalLocale);
      amountsHidden.set(false);
    });

    it('keeps the currency symbol and drops the figure', () => {
      currentLocale.set('pt-BR');
      amountsHidden.set(true);

      const masked = formatMoney(1234.56, 'BRL');

      expect(masked).toContain('R$');
      expect(masked).toContain('••••');
      expect(masked).not.toMatch(/\d/);
    });

    it('places the symbol the way the locale does', () => {
      amountsHidden.set(true);

      currentLocale.set('pt-BR');
      expect(normalise(formatMoney(10, 'BRL'))).toBe('R$ ••••');

      currentLocale.set('en-US');
      expect(normalise(formatMoney(10, 'USD'))).toBe('$••••');
    });

    it('masks every amount to the same width, whatever the figure', () => {
      amountsHidden.set(true);

      expect(formatMoney(7, 'BRL')).toBe(formatMoney(1_234_567.89, 'BRL'));
    });

    it('follows the language switch while masked', () => {
      amountsHidden.set(true);
      currentLocale.set('pt-BR');

      const brazilian = formatMoney(10, 'USD');

      currentLocale.set('en-US');
      const american = formatMoney(10, 'USD');

      expect(normalise(brazilian)).toBe('US$ ••••');
      expect(normalise(american)).toBe('$••••');
    });

    it('leaves formatMoneyUnmasked alone, for fields being edited', () => {
      currentLocale.set('pt-BR');
      amountsHidden.set(true);

      expect(formatMoneyUnmasked(1234.56, 'BRL')).toContain('1.234,56');
    });

    it('leaves the statement review readable', () => {
      currentLocale.set('pt-BR');
      amountsHidden.set(true);

      expect(formatMinor({ amountMinor: 123456, currency: 'BRL' })).toContain('1.234,56');
      expect(currencySymbol('BRL')).toBe('R$');
    });

    it('goes back to real figures when switched off', () => {
      currentLocale.set('pt-BR');

      amountsHidden.set(true);
      expect(normalise(formatMoney(10, 'BRL'))).toBe('R$ ••••');

      amountsHidden.set(false);
      expect(formatMoney(10, 'BRL')).toContain('10,00');
    });
  });

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
