import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Paginator } from 'primeng/paginator';
import { Select } from 'primeng/select';

import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { TransactionKind } from '../../shared/models/enums';
import { Transaction } from '../../shared/models/transaction';
import { FintrackCard } from '../../shared/ui/card';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { FintrackTransactionRow } from '../../shared/ui/transaction-row';
import { currentMonthRange, fromIsoDate, toIsoDate } from '../../shared/util/date';
import { TRANSACTION_KIND_OPTIONS } from '../../shared/util/enum-labels';
import { formatMoney, sumMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { RecurringRulesDialog } from './recurring-rules-dialog';
import { TransactionFormDialog } from './transaction-form-dialog';
import { TransactionService } from './transaction.service';

@Component({
  selector: 'fintrack-transactions-page',
  imports: [
    Button,
    Select,
    DatePicker,
    Paginator,
    FormsModule,
    FintrackCard,
    FintrackPageHeader,
    FintrackEmptyState,
    FintrackTransactionRow,
    TransactionFormDialog,
    RecurringRulesDialog,
  ],
  templateUrl: './transactions-page.html',
})
export class TransactionsPage {
  protected readonly service = inject(TransactionService);
  private readonly accounts = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);

  protected readonly kindOptions = TRANSACTION_KIND_OPTIONS;
  protected readonly pageSize = 25;
  protected dialogOpen = signal(false);
  protected rulesOpen = signal(false);
  protected readonly first = signal(0);
  protected readonly selected = signal<Transaction | null>(null);

  /** Server-side filters live on the service; these two are client-side only. */
  protected readonly kindFilter = signal<TransactionKind | null>(null);
  protected readonly categoryFilter = signal<Uuid | null>(null);
  protected readonly range = signal<{ from: IsoDate; to: IsoDate } | null>(null);

  protected readonly categoryOptions = computed(() => this.categories.options());

  protected readonly rangeValue = computed(() => {
    const current = this.range();
    if (!current) {
      return null;
    }
    return [fromIsoDate(current.from), fromIsoDate(current.to)].filter(Boolean) as Date[];
  });

  protected readonly rows = computed(() => {
    const kind = this.kindFilter();
    return this.service.sorted().filter((tx) => kind === null || tx.kind === kind);
  });

  protected readonly pagedRows = computed(() =>
    this.rows().slice(this.first(), this.first() + this.pageSize),
  );

  /** Income minus everything else, over the rows currently shown. */
  protected readonly net = computed(() => {
    const inflow = sumMoney(
      this.rows()
        .filter((t) => t.kind === 'ACCOUNT_CREDIT')
        .map((t) => t.amount),
    );
    const outflow = sumMoney(
      this.rows()
        .filter((t) => t.kind !== 'ACCOUNT_CREDIT')
        .map((t) => t.amount),
    );
    return inflow - outflow;
  });

  constructor() {
    const month = currentMonthRange();
    this.range.set(month);
    this.service.setFilters({ from: month.from, to: month.to });

    // A narrower filter can leave fewer rows than the current offset, which would show an
    // empty page with no obvious way back. Go to the first page whenever the set changes.
    effect(() => {
      this.rows();
      this.first.set(0);
    });
  }

  protected onRangeChange(value: Date[] | null): void {
    if (!value || value.length === 0 || !value[0]) {
      this.range.set(null);
      this.pushFilters(undefined, undefined);
      return;
    }

    const [start, end] = value;
    if (!end) {
      return;
    }
    const next = { from: toIsoDate(start), to: toIsoDate(end) };
    this.range.set(next);
    this.pushFilters(next.from, next.to);
  }

  protected onCategoryChange(categoryId: Uuid | null): void {
    this.categoryFilter.set(categoryId);
    const current = this.range();
    this.pushFilters(current?.from, current?.to);
  }

  protected clearFilters(): void {
    this.range.set(null);
    this.kindFilter.set(null);
    this.categoryFilter.set(null);
    this.service.setFilters({});
  }

  private pushFilters(from: IsoDate | undefined, to: IsoDate | undefined): void {
    this.service.setFilters({
      from,
      to,
      categoryId: this.categoryFilter() ?? undefined,
    });
  }

  protected category(id: Uuid): Category | undefined {
    return this.categories.byIdMap().get(id);
  }

  protected sourceName(tx: Transaction): string {
    if (tx.creditCardId) {
      return this.cards.byIdMap().get(tx.creditCardId)?.name ?? 'Card';
    }
    return this.accounts.byIdMap().get(tx.bankAccountId ?? '')?.name ?? 'Account';
  }

  protected money(value: number): string {
    return formatMoney(Math.abs(value));
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(tx: Transaction): void {
    this.selected.set(tx);
    this.dialogOpen.set(true);
  }
}
