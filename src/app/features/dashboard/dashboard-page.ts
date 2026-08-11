import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UIChart } from 'primeng/chart';
import { Checkbox } from 'primeng/checkbox';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { CategoryBreakdown, Dashboard } from '../../shared/models/dashboard';
import { InvoiceStatus } from '../../shared/models/enums';
import { Transaction } from '../../shared/models/transaction';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxCategoryBadge } from '../../shared/ui/category-badge';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxMonthNav } from '../../shared/ui/month-nav';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { daysUntil, startOfMonth, toIsoDate } from '../../shared/util/date';
import { monthYear, shortDate } from '../../shared/util/date-format';
import {
  defaultCategoryNames,
  INVOICE_STATUS_SEVERITY,
  invoiceStatusLabels,
} from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { TransactionFormDialog } from '../transactions/transaction-form-dialog';
import { TransactionService } from '../transactions/transaction.service';

@Component({
  selector: 'planelyx-dashboard-page',
  imports: [
    Tag,
    UIChart,
    Checkbox,
    FormsModule,
    RouterLink,
    PlanelyxCard,
    PlanelyxCategoryBadge,
    PlanelyxMonthNav,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
    TransactionFormDialog,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly cards = inject(CreditCardService);
  private readonly accounts = inject(BankAccountService);
  private readonly categories = inject(CategoryService);
  private readonly transactions = inject(TransactionService);

  protected readonly month = signal(startOfMonth(new Date()));

  private readonly resource = httpResource<Dashboard>(() => ({
    url: `${environment.apiUrl}/dashboard`,
    params: { month: monthParam(this.month()) },
  }));

  protected readonly t = injectTranslate();
  private readonly statusLabels = invoiceStatusLabels();
  private readonly translateCategory = defaultCategoryNames();

  protected readonly isLoading = computed(() => this.resource.isLoading());

  protected readonly data = computed<Dashboard | null>(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly monthLabel = computed(() => monthYear(this.month()));

  protected readonly accountBalanceTotal = computed(() => this.data()?.accountBalanceTotal ?? 0);

  protected readonly accountsLabel = computed(() =>
    this.t(this.isFuture() ? 'dashboard.acrossAccountsEom' : 'dashboard.acrossAccounts', {
      count: this.accountCount(),
      amount: formatMoney(this.accountBalanceTotal()),
    }),
  );

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
  protected readonly balances = computed(() => [...(this.data()?.accountBalances ?? [])]);
  protected readonly upcomingInvoices = computed(() => [...(this.data()?.upcomingInvoices ?? [])]);
  protected readonly dialogOpen = signal(false);
  protected readonly selected = signal<Transaction | null>(null);

  protected readonly billsDue = computed(() => [...(this.data()?.billsDue ?? [])]);
  protected readonly billsDueTotal = computed(() => this.data()?.billsDueTotal ?? 0);
  protected readonly billsDueCount = computed(() => this.data()?.billsDueCount ?? 0);
  protected readonly accountCount = computed(() => this.balances().length);
  protected readonly openInvoiceCount = computed(() => this.upcomingInvoices().length);

  /** Ticks a bill off the reminder, or puts it back. */
  protected toggleBill(bill: Transaction, paid: boolean): void {
    this.transactions.setPaid(bill.id, paid).subscribe(() => this.resource.reload());
  }

  /** Opens a bill for editing without leaving the dashboard. */
  protected openEdit(bill: Transaction): void {
    this.selected.set(bill);
    this.dialogOpen.set(true);
  }

  /** Refetches every figure on the page. */
  protected reload(): void {
    this.resource.reload();
  }

  protected category(id: Uuid): Category | undefined {
    return this.categories.byIdMap().get(id);
  }

  protected accountName(bill: Transaction): string {
    return this.accounts.byIdMap().get(bill.bankAccountId ?? '')?.name ?? '';
  }

  protected readonly incomplete = computed(
    () => this.isFuture() && (this.data()?.beyondGeneratedOccurrences ?? false),
  );

  protected readonly chartData = computed(() => {
    const breakdown = this.data()?.categoryBreakdown ?? [];
    return {
      labels: breakdown.map((row) => this.sliceLabel(row)),
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

  /** The remainder slice carries no category id. */
  private sliceLabel(row: CategoryBreakdown): string {
    return row.categoryId === null
      ? this.t('dashboard.otherCategories')
      : this.translateCategory()(row.name);
  }

  protected readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  protected cardName(id: Uuid): string {
    return this.cards.byIdMap().get(id)?.name ?? this.t('dashboard.card');
  }

  protected statusLabel(status: InvoiceStatus): string {
    return this.statusLabels()[status];
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
    return shortDate(iso);
  }

  protected dueText(iso: IsoDate): string | null {
    const days = daysUntil(iso);
    if (days === null) {
      return null;
    }
    if (days < 0) {
      return this.t('invoices.overdue', { days: Math.abs(days) });
    }
    return days === 0 ? this.t('invoices.dueToday') : this.t('invoices.dueInDays', { days });
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
