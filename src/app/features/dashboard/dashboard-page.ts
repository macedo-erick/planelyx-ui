import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { UIChart } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { IsoDate, Uuid } from '../../shared/models/common';
import { InvoiceStatus } from '../../shared/models/enums';
import { Transaction } from '../../shared/models/transaction';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { currentMonthRange, daysUntil, fromIsoDate } from '../../shared/util/date';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_SEVERITY } from '../../shared/util/enum-labels';
import { formatMoney, roundCents, sumMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { InvoiceService } from '../invoices/invoice.service';

@Component({
  selector: 'fintrack-dashboard-page',
  imports: [TableModule, Tag, UIChart, Button, RouterLink, FintrackPageHeader, FintrackEmptyState],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  protected readonly accounts = inject(BankAccountService);
  protected readonly invoices = inject(InvoiceService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);

  private readonly month = currentMonthRange();

  /**
   * Unfiltered: balances need the full history, and the current month is derived from the
   * same list. The API has no aggregate or balance endpoint, so the maths happens here.
   */
  private readonly allTransactions = httpResource<Transaction[]>(
    () => `${environment.apiUrl}/transactions`,
    { defaultValue: [] },
  );

  protected readonly monthLabel = computed(() =>
    new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  private readonly monthTransactions = computed(() =>
    this.allTransactions
      .value()
      .filter((t) => t.transactionDate >= this.month.from && t.transactionDate <= this.month.to),
  );

  protected readonly monthIncome = computed(() =>
    sumMoney(
      this.monthTransactions()
        .filter((t) => t.kind === 'ACCOUNT_CREDIT')
        .map((t) => t.amount),
    ),
  );

  protected readonly monthExpense = computed(() =>
    sumMoney(
      this.monthTransactions()
        .filter((t) => t.kind !== 'ACCOUNT_CREDIT')
        .map((t) => t.amount),
    ),
  );

  /** initialBalance + account credits − account debits. Card charges never touch it. */
  protected readonly balances = computed(() => {
    const transactions = this.allTransactions.value();
    return this.accounts.sorted().map((account) => {
      const mine = transactions.filter((t) => t.bankAccountId === account.id);
      const credits = sumMoney(
        mine.filter((t) => t.kind === 'ACCOUNT_CREDIT').map((t) => t.amount),
      );
      const debits = sumMoney(mine.filter((t) => t.kind === 'ACCOUNT_DEBIT').map((t) => t.amount));
      return {
        name: account.name,
        bankName: account.bankName,
        currency: account.currency,
        balance: roundCents(account.initialBalance + credits - debits),
      };
    });
  });

  protected readonly totalBalance = computed(() =>
    sumMoney(this.balances().map((row) => row.balance)),
  );

  protected readonly outstandingInvoices = computed(() =>
    sumMoney(this.invoices.unpaid().map((i) => i.totalAmount)),
  );

  protected readonly upcomingInvoices = computed(() =>
    [...this.invoices.unpaid()].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5),
  );

  protected readonly categoryChart = computed(() => {
    const totals = new Map<Uuid, number>();
    for (const tx of this.monthTransactions()) {
      if (tx.kind === 'ACCOUNT_CREDIT') {
        continue;
      }
      totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount);
    }

    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      labels: ranked.map(([id]) => this.categories.byIdMap().get(id)?.name ?? 'Uncategorised'),
      values: ranked.map(([, total]) => roundCents(total)),
      colors: ranked.map(
        ([id], index) =>
          this.categories.byIdMap().get(id)?.color ?? PALETTE[index % PALETTE.length],
      ),
    };
  });

  protected readonly chartData = computed(() => {
    const chart = this.categoryChart();
    return {
      labels: chart.labels,
      datasets: [{ data: chart.values, backgroundColor: chart.colors, borderWidth: 0 }],
    };
  });

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
