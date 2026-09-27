import type { Scale, TooltipItem } from 'chart.js';
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

type TickCallback = (this: Scale, value: number) => string;

/** Just enough of a Chart.js scale for the tick callbacks: its labels and the chart's width. */
function scale(width: number, labels: readonly string[] = []): Scale {
  return {
    chart: { width },
    getLabelForValue: (index: number) => labels[index],
  } as unknown as Scale;
}

function xTick(value: number, width: number, labels: readonly string[]): string {
  const callback = trendChartOptions().scales?.['x']?.ticks?.callback as TickCallback;
  return callback.call(scale(width, labels), value);
}

function yTick(value: number, width: number): string {
  const callback = trendChartOptions().scales?.['y']?.ticks?.callback as TickCallback;
  return callback.call(scale(width), value);
}

const normalise = (value: string) => value.replace(/\u00A0/g, ' ');

describe('trend chart', () => {
  const originalLocale = currentLocale();

  afterEach(() => {
    currentLocale.set(originalLocale);
    amountsHidden.set(false);
  });

  describe('trendChartData', () => {
    it('draws one point per month, in the order the API sent them', () => {
      const data = trendChartData(TREND, LABELS);

      expect(data.labels).toEqual(['2025-12', '2026-01', '2026-02']);
      expect(data.datasets.map((set) => set.label)).toEqual(['Income', 'Spending']);
      expect(data.datasets[0].data).toEqual([1000, 0, 1200]);
      expect(data.datasets[1].data).toEqual([400, 0, 700]);
    });

    it('keeps a quiet month as a point at zero rather than a gap', () => {
      const data = trendChartData(TREND, LABELS);

      expect(data.datasets[0].data).toHaveLength(3);
      expect(data.datasets[0].data[1]).toBe(0);
    });

    it('never bends the line past the points either side of it', () => {
      const data = trendChartData(TREND, LABELS);

      for (const set of data.datasets) {
        expect(set).toMatchObject({ cubicInterpolationMode: 'monotone' });
      }
    });
  });

  describe('the month axis', () => {
    const keys = TREND.map((row) => row.month);

    it('names the month in full when there is room', () => {
      currentLocale.set('pt-BR');

      expect(xTick(0, 1000, keys)).toBe('dez. de 2025');
    });

    it('shortens to month and two-digit year on a phone', () => {
      currentLocale.set('pt-BR');
      expect(xTick(0, 360, keys)).toBe('dez/25');

      currentLocale.set('en-US');
      expect(xTick(2, 360, keys)).toBe('Feb/26');
    });

    it('shows a month it cannot parse as the raw key instead of shifting the rest', () => {
      expect(xTick(0, 1000, ['bogus'])).toBe('bogus');
      expect(xTick(0, 360, ['bogus'])).toBe('bogus');
    });

    it('does not tilt the labels', () => {
      expect(trendChartOptions().scales?.['x']?.ticks).toMatchObject({ maxRotation: 0 });
    });
  });

  describe('the amount axis', () => {
    it('drops the cents when there is room', () => {
      currentLocale.set('pt-BR');

      expect(normalise(yTick(14000, 1000))).toBe('R$ 14.000');
    });

    it('goes compact on a phone', () => {
      currentLocale.set('pt-BR');

      expect(normalise(yTick(14000, 360))).toBe('R$ 14 mil');
      expect(normalise(yTick(8500, 360))).toBe('R$ 8,5 mil');
    });

    it('is masked while amounts are hidden, at any width', () => {
      currentLocale.set('pt-BR');
      amountsHidden.set(true);

      expect(yTick(14000, 1000)).not.toMatch(/\d/);
      expect(yTick(14000, 360)).not.toMatch(/\d/);
    });
  });

  describe('the tooltip', () => {
    const callbacks = () => trendChartOptions().plugins?.tooltip?.callbacks;

    it('names the month in full and keeps the exact amount', () => {
      currentLocale.set('pt-BR');

      const title = callbacks()?.title as (items: TooltipItem<'line'>[]) => string;
      const label = callbacks()?.label as (item: TooltipItem<'line'>) => string;
      const item = { label: '2026-08', dataset: { label: 'Receitas' }, parsed: { y: 1234.56 } };

      expect(title.call(null as never, [item as TooltipItem<'line'>])).toBe('ago. de 2026');
      expect(normalise(label.call(null as never, item as TooltipItem<'line'>))).toBe(
        'Receitas: R$ 1.234,56',
      );
    });

    it('is masked while amounts are hidden', () => {
      currentLocale.set('pt-BR');
      amountsHidden.set(true);

      const label = callbacks()?.label as (item: TooltipItem<'line'>) => string;
      const item = { dataset: { label: 'Receitas' }, parsed: { y: 1234.56 } };

      expect(label.call(null as never, item as TooltipItem<'line'>)).toMatch(/^Receitas: .*••••/);
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
