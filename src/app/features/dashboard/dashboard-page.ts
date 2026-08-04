import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UIChart } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { IsoDate, Uuid } from '../../shared/models/common';
import { Dashboard } from '../../shared/models/dashboard';
import { InvoiceStatus } from '../../shared/models/enums';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackMonthNav } from '../../shared/ui/month-nav';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { daysUntil, fromIsoDate, startOfMonth, toIsoDate } from '../../shared/util/date';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_SEVERITY } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CreditCardService } from '../credit-cards/credit-card.service';

@Component({
  selector: 'fintrack-dashboard-page',
  imports: [
    TableModule,
    Tag,
    UIChart,
    RouterLink,
    FintrackMonthNav,
    FintrackPageHeader,
    FintrackEmptyState,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly cards = inject(CreditCardService);

  /** Drives the whole page; stepping it is what makes past and future months viewable. */
  protected readonly month = signal(startOfMonth(new Date()));

  /**
   * Every figure is computed server-side. Balances come back cumulative as of the end of the
   * selected month, so stepping forward reads as a forecast over the installments and recurring
   * occurrences already scheduled — no projection needed, those rows exist.
   */
  private readonly resource = httpResource<Dashboard>(() => ({
    url: `${environment.apiUrl}/dashboard`,
    params: { month: monthParam(this.month()) },
  }));

  protected readonly isLoading = computed(() => this.resource.isLoading());

  protected readonly data = computed<Dashboard | null>(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly monthLabel = computed(() =>
    this.month().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  /** True once the selected month is later than the one we are actually in. */
  protected readonly isFuture = computed(
    () => this.month().getTime() > startOfMonth(new Date()).getTime(),
  );

  protected readonly totalBalance = computed(() => this.data()?.totalBalance ?? 0);
  protected readonly invoicesDueTotal = computed(() => this.data()?.invoicesDueTotal ?? 0);
  protected readonly invoicesDueCount = computed(() => this.data()?.invoicesDueCount ?? 0);
  protected readonly income = computed(() => this.data()?.income ?? 0);
  protected readonly expense = computed(() => this.data()?.expense ?? 0);
  protected readonly outstandingInvoices = computed(
    () => this.data()?.outstandingInvoiceTotal ?? 0,
  );
  // Spread rather than passed through: p-table's `value` input is a mutable array.
  protected readonly balances = computed(() => [...(this.data()?.accountBalances ?? [])]);
  protected readonly upcomingInvoices = computed(() => [...(this.data()?.upcomingInvoices ?? [])]);
  protected readonly accountCount = computed(() => this.balances().length);
  protected readonly openInvoiceCount = computed(() => this.upcomingInvoices().length);

  protected readonly incomplete = computed(
    () => this.isFuture() && (this.data()?.beyondGeneratedOccurrences ?? false),
  );

  protected readonly chartData = computed(() => {
    const breakdown = this.data()?.categoryBreakdown ?? [];
    return {
      labels: breakdown.map((row) => row.name),
      datasets: [
        {
          data: breakdown.map((row) => row.total),
          backgroundColor: breakdown.map(
            (row, index) => row.color ?? PALETTE[index % PALETTE.length],
          ),
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly hasBreakdown = computed(
    () => (this.data()?.categoryBreakdown ?? []).length > 0,
  );

  protected readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  protected cardName(id: Uuid): string {
    return this.cards.byIdMap().get(id)?.name ?? 'Card';
  }

  protected statusLabel(status: InvoiceStatus): string {
    return INVOICE_STATUS_LABELS[status];
  }

  protected statusSeverity(status: InvoiceStatus): 'success' | 'warn' | 'info' {
    return INVOICE_STATUS_SEVERITY[status];
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected moneyIn(value: number, currency: string): string {
    return formatMoney(value, currency);
  }

  protected shortDate(iso: IsoDate): string {
    const date = fromIsoDate(iso);
    return date ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : iso;
  }

  protected dueText(iso: IsoDate): string | null {
    const days = daysUntil(iso);
    if (days === null) {
      return null;
    }
    if (days < 0) {
      return `${Math.abs(days)} days overdue`;
    }
    return days === 0 ? 'Due today' : `in ${days} days`;
  }
}

/** `YYYY-MM`, taken off the local calendar so the month never drifts across a timezone. */
function monthParam(month: Date): string {
  return toIsoDate(month).slice(0, 7);
}

const PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#64748b',
];
