import type { ChartData, ChartOptions, Scale } from 'chart.js';

import { MonthKey } from '../../shared/models/common';
import { MonthMovement } from '../../shared/models/dashboard';
import { fromMonthKey } from '../../shared/util/date';
import { monthYear } from '../../shared/util/date-format';
import { currentLocale } from '../../shared/util/locale';
import { formatMoney, formatMoneyRounded } from '../../shared/util/money';

/** The two series' names, already translated by the caller. */
export interface TrendLabels {
  readonly income: string;
  readonly expense: string;
}

/** The same greens and reds the income and result tiles use. */
const INCOME_COLOR = '#16a34a';
const EXPENSE_COLOR = '#ef4444';

/** Below this many pixels the axes switch to their short forms, which is roughly a phone. */
const NARROW_WIDTH = 480;

/**
 * The line chart's data: one point per month, in the order the API sent them, which is oldest
 * first. The labels are the month keys themselves; the axis and the tooltip turn them into words,
 * so each can pick a length that fits where it is drawn.
 */
export function trendChartData(
  trend: readonly MonthMovement[],
  labels: TrendLabels,
): ChartData<'line'> {
  return {
    labels: trend.map((row) => row.month),
    datasets: [
      series(
        labels.income,
        INCOME_COLOR,
        trend.map((row) => row.income),
      ),
      series(
        labels.expense,
        EXPENSE_COLOR,
        trend.map((row) => row.expense),
      ),
    ],
  };
}

/**
 * The axes drop the cents, and on a narrow chart shorten further — "R$ 14 mil", "out/25" — so
 * the plot keeps its width on a phone. The tooltip keeps the exact figure and the full month.
 *
 * Every amount goes through the money formatters, so hiding amounts masks the chart too. Chart.js
 * only reads options when it draws, so the caller has to hand over a fresh object whenever the
 * mask or the locale changes.
 */
export function trendChartOptions(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          title: (items) => (items.length > 0 ? monthLabel(items[0].label) : ''),
          label: (context) => `${context.dataset.label}: ${formatMoney(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          callback: function (this: Scale, value) {
            const key = this.getLabelForValue(Number(value));
            return isNarrow(this) ? shortMonthLabel(key) : monthLabel(key);
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (this: Scale, value) {
            return formatMoneyRounded(Number(value), { compact: isNarrow(this) });
          },
        },
      },
    },
  };
}

/** Whether there is anything worth drawing: twelve points at zero is an empty chart. */
export function hasMovement(trend: readonly MonthMovement[]): boolean {
  return trend.some((row) => row.income !== 0 || row.expense !== 0);
}

/**
 * `monotone` rather than a plain tension curve: the line still bends between months, but never
 * past the points on either side, so it cannot show a month rising or falling further than it
 * did.
 */
function series(label: string, color: string, data: number[]): ChartData<'line'>['datasets'][0] {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    pointRadius: 3,
    cubicInterpolationMode: 'monotone',
  };
}

function isNarrow(scale: Scale): boolean {
  return scale.chart.width < NARROW_WIDTH;
}

/** e.g. "out. de 2025". A key that fails to parse is shown as is rather than shifting the rest. */
function monthLabel(key: MonthKey): string {
  const date = fromMonthKey(key);
  return date ? monthYear(date, 'short') : key;
}

/** e.g. "out/25" — short enough for a phone to show without tilting. */
function shortMonthLabel(key: MonthKey): string {
  const date = fromMonthKey(key);
  if (!date) {
    return key;
  }

  const month = date.toLocaleDateString(currentLocale(), { month: 'short' }).replace(/\.$/, '');
  return `${month}/${String(date.getFullYear() % 100).padStart(2, '0')}`;
}
