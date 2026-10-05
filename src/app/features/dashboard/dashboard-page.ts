import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
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
import { Invoice } from '../../shared/models/invoice';
import { Transaction } from '../../shared/models/transaction';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxCategoryBadge } from '../../shared/ui/category-badge';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxMonthNav } from '../../shared/ui/month-nav';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { amountsHidden } from '../../shared/util/amount-visibility';
import { daysUntil, startOfMonth, toIsoDate } from '../../shared/util/date';
import { monthYear, shortDate } from '../../shared/util/date-format';
import {
  defaultCategoryNames,
  INVOICE_STATUS_SEVERITY,
  invoiceStatusLabels,
} from '../../shared/util/enum-labels';
import { currentLocale } from '../../shared/util/locale';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CurrencyService } from '../bank-accounts/currency.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { TransactionFormDialog } from '../transactions/transaction-form-dialog';
import { TransactionService } from '../transactions/transaction.service';
import { hasMovement, trendChartData, trendChartOptions } from './trend-chart';

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
  private readonly currencies = inject(CurrencyService);

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
  protected readonly investedTotal = computed(() => this.data()?.investedTotal ?? 0);
  protected readonly netWorth = computed(() => this.data()?.netWorth ?? 0);
  protected readonly investmentBalances = computed(() => this.data()?.investmentBalances ?? []);
  protected readonly hasInvestments = computed(() => this.investmentBalances().length > 0);
  protected readonly invoicesDueTotal = computed(() => this.data()?.invoicesDueTotal ?? 0);
  protected readonly invoicesDueCount = computed(() => this.data()?.invoicesDueCount ?? 0);
  protected readonly income = computed(() => this.data()?.income ?? 0);
  protected readonly expense = computed(() => this.data()?.expense ?? 0);
  protected readonly result = computed(() => this.data()?.result ?? 0);

  protected readonly resultChangeLabel = computed(() =>
    this.t('dashboard.resultChange', {
      amount: this.signed(this.result() - (this.data()?.previousResult ?? 0)),
    }),
  );

  protected readonly balances = computed(() => [...(this.data()?.accountBalances ?? [])]);
  protected readonly invoicesDue = computed(() => [...(this.data()?.invoicesDue ?? [])]);
  protected readonly invoicesPaid = computed(() => [...(this.data()?.invoicesPaid ?? [])]);
  /** Collapsed again whenever the month changes. */
  protected readonly showAllInvoicesDue = linkedSignal({
    source: this.month,
    computation: () => false,
  });
  protected readonly visibleInvoicesDue = computed(() =>
    this.showAllInvoicesDue() ? this.invoicesDue() : this.invoicesDue().slice(0, INVOICE_PREVIEW),
  );
  protected readonly hasMoreInvoicesDue = computed(
    () => this.invoicesDue().length > INVOICE_PREVIEW,
  );
  protected readonly dialogOpen = signal(false);
  protected readonly selected = signal<Transaction | null>(null);

  protected readonly billsDue = computed(() => [...(this.data()?.billsDue ?? [])]);
  protected readonly billsDueTotal = computed(() => this.data()?.billsDueTotal ?? 0);
  protected readonly billsDueCount = computed(() => this.data()?.billsDueCount ?? 0);
  protected readonly billsPaid = computed(() => [...(this.data()?.billsPaid ?? [])]);
  protected readonly accountCount = computed(() => this.balances().length);

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

  protected readonly hasTrend = computed(() => hasMovement(this.data()?.trend ?? []));

  protected readonly trendData = computed(() =>
    trendChartData(this.data()?.trend ?? [], {
      income: this.t('dashboard.trendIncome'),
      expense: this.t('dashboard.trendExpense'),
    }),
  );

  /** Rebuilt when the mask or the locale changes, since Chart.js only reads options as it draws. */
  protected readonly trendOptions = computed(() => {
    amountsHidden();
    currentLocale();
    return trendChartOptions();
  });

  protected cardName(id: Uuid): string {
    return this.cards.byIdMap().get(id)?.name ?? this.t('dashboard.card');
  }

  protected statusLabel(status: InvoiceStatus): string {
    return this.statusLabels()[status];
  }

  protected statusSeverity(status: InvoiceStatus): 'success' | 'warn' | 'info' {
    return INVOICE_STATUS_SEVERITY[status];
  }

  /**
   * The headline tiles are sums the API took across every account, so no single currency is
   * correct for them. They keep the configured fallback until the API reports one.
   */
  protected money(value: number): string {
    return formatMoney(value);
  }

  /** Signed, so a change reads as up or down rather than a bare amount. */
  private signed(value: number): string {
    const cents = Math.round(value * 100) / 100;
    return `${cents >= 0 ? '+' : '−'}${formatMoney(Math.abs(cents))}`;
  }

  /** Signed, so a return reads as a gain or a loss rather than a bare amount. */
  protected returnIn(value: number, currency: string): string {
    return `${value >= 0 ? '+' : '−'}${formatMoney(Math.abs(value), currency)}`;
  }

  protected moneyIn(value: number, currency: string): string {
    return formatMoney(value, currency);
  }

  /** A bill settles against one account or card, so it has a currency of its own. */
  protected moneyForBill(bill: Transaction): string {
    return formatMoney(bill.amount, this.currencies.forSource(bill));
  }

  protected moneyForInvoice(invoice: Invoice): string {
    return formatMoney(invoice.totalAmount, this.currencies.forCard(invoice.creditCardId));
  }

  protected shortDate(iso: IsoDate): string {
    return shortDate(iso);
  }

  protected isOverdue(iso: IsoDate): boolean {
    return (daysUntil(iso) ?? 0) < 0;
  }

  /** The day an invoice was settled, on the reader's own calendar. */
  protected billPaidOn(bill: Transaction): string {
    return bill.paidDate ? shortDate(bill.paidDate) : '';
  }

  protected paidOn(invoice: Invoice): string {
    return invoice.paidAt ? shortDate(toIsoDate(new Date(invoice.paidAt))) : '';
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

/** How many owed invoices show before the list is expanded. */
const INVOICE_PREVIEW = 5;

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
