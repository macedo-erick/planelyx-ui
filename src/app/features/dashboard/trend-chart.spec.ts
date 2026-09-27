import type { TooltipItem } from 'chart.js';
import { afterEach, describe, expect, it } from 'vitest';

import { MonthMovement } from '../../shared/models/dashboard';
import { amountsHidden } from '../../shared/util/amount-visibility';
import { currentLocale } from '../../shared/util/locale';
import { hasMovement, trendChartData, trendChartOptions } from './trend-chart';

const LABELS = { income: 'Income', expense: 'Spending' };

const TREND: MonthMovement[] = [
  { month: '2025-12', income: 1000, expense: 400 },
  { month: '2026-01', income: 0, expense: 0 },
  { month: '2026-02', income: 1200, expense: 700 },
];

describe('trend chart', () => {
  const originalLocale = currentLocale();

  afterEach(() => {
    currentLocale.set(originalLocale);
    amountsHidden.set(false);
  });

  describe('trendChartData', () => {
    it('draws one point per month, in the order the API sent them', () => {
      currentLocale.set('en-US');

      const data = trendChartData(TREND, LABELS);

      expect(data.labels).toEqual(['Dec 2025', 'Jan 2026', 'Feb 2026']);
      expect(data.datasets.map((set) => set.label)).toEqual(['Income', 'Spending']);
      expect(data.datasets[0].data).toEqual([1000, 0, 1200]);
      expect(data.datasets[1].data).toEqual([400, 0, 700]);
    });

    it('keeps a quiet month as a point at zero rather than a gap', () => {
      const data = trendChartData(TREND, LABELS);

      expect(data.datasets[0].data).toHaveLength(3);
      expect(data.datasets[0].data[1]).toBe(0);
    });

    it('labels a month it cannot parse with the raw key instead of shifting the rest', () => {
      const data = trendChartData([{ month: 'bogus', income: 1, expense: 1 }, ...TREND], LABELS);

      expect(data.labels).toHaveLength(4);
      expect(data.labels?.[0]).toBe('bogus');
    });
  });

  describe('trendChartOptions', () => {
    it('masks the axis and the tooltip while amounts are hidden', () => {
      currentLocale.set('pt-BR');
      amountsHidden.set(true);

      const options = trendChartOptions();
      const tick = options.scales?.['y']?.ticks?.callback as (value: number) => string;
      const label = options.plugins?.tooltip?.callbacks?.label as (
        item: TooltipItem<'line'>,
      ) => string;

      const item = { dataset: { label: 'Receitas' }, parsed: { y: 1234.56 } };

      expect(tick.call(null, 1234.56)).not.toMatch(/\d/);
      expect(label.call(null as never, item as TooltipItem<'line'>)).toMatch(/^Receitas: .*••••/);
    });

    it('formats the axis in the active locale when amounts are shown', () => {
      currentLocale.set('pt-BR');

      const tick = trendChartOptions().scales?.['y']?.ticks?.callback as (value: number) => string;

      expect(tick.call(null, 1234.56)).toContain('1.234,56');
    });
  });

  describe('hasMovement', () => {
    it('is false for a year of zeros', () => {
      expect(hasMovement([{ month: '2026-01', income: 0, expense: 0 }])).toBe(false);
      expect(hasMovement([])).toBe(false);
    });

    it('is true once any month moved', () => {
      expect(hasMovement(TREND)).toBe(true);
    });
  });
});
