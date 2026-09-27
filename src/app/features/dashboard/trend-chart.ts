import type { ChartData, ChartOptions } from 'chart.js';

import { MonthMovement } from '../../shared/models/dashboard';
import { fromMonthKey } from '../../shared/util/date';
import { monthYear } from '../../shared/util/date-format';
import { formatMoney } from '../../shared/util/money';

/** The two series' names, already translated by the caller. */
export interface TrendLabels {
  readonly income: string;
  readonly expense: string;
}

/** The same greens and reds the income and result tiles use. */
const INCOME_COLOR = '#16a34a';
const EXPENSE_COLOR = '#ef4444';

/**
 * The line chart's data: one point per month, in the order the API sent them, which is oldest
 * first. A month that fails to parse keeps its raw key as a label rather than dropping the point
 * and shifting every later month onto the wrong one.
 */
export function trendChartData(
  trend: readonly MonthMovement[],
  labels: TrendLabels,
): ChartData<'line'> {
  return {
    labels: trend.map((row) => monthLabel(row.month)),
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
 * Axis and tooltip go through `formatMoney`, so hiding amounts masks the chart too. Chart.js
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
          label: (context) => `${context.dataset.label}: ${formatMoney(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => formatMoney(Number(value)) },
      },
    },
  };
}

/** Whether there is anything worth drawing: twelve points at zero is an empty chart. */
export function hasMovement(trend: readonly MonthMovement[]): boolean {
  return trend.some((row) => row.income !== 0 || row.expense !== 0);
}

function series(label: string, color: string, data: number[]): ChartData<'line'>['datasets'][0] {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    pointRadius: 3,
    tension: 0.3,
  };
}

function monthLabel(key: string): string {
  const date = fromMonthKey(key);
  return date ? monthYear(date, 'short') : key;
}
