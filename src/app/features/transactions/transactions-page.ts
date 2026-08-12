import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Select } from 'primeng/select';

import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { TransactionKind } from '../../shared/models/enums';
import { Transaction } from '../../shared/models/transaction';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { PlanelyxTransactionRow } from '../../shared/ui/transaction-row';
import { currentMonthRange, fromIsoDate, toIsoDate } from '../../shared/util/date';
import { datePickerFormat } from '../../shared/util/date-format';
import { transactionKindOptions } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CurrencyService } from '../bank-accounts/currency.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { RecurringRulesDialog } from './recurring-rules-dialog';
import { TransactionFormDialog } from './transaction-form-dialog';
import { TransactionService } from './transaction.service';

@Component({
  selector: 'planelyx-transactions-page',
  imports: [
    Button,
    Select,
    DatePicker,
    Paginator,
    FormsModule,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
    PlanelyxTransactionRow,
    TransactionFormDialog,
    RecurringRulesDialog,
  ],
  templateUrl: './transactions-page.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class TransactionsPage {
  protected readonly service = inject(TransactionService);
  private readonly accounts = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);
  private readonly currencies = inject(CurrencyService);

  protected readonly t = injectTranslate();
  protected readonly kindOptions = transactionKindOptions();
  protected readonly dateFormat = computed(() => datePickerFormat());
  protected dialogOpen = signal(false);
  protected rulesOpen = signal(false);
  protected readonly selected = signal<Transaction | null>(null);

  protected readonly page = signal(0);
  protected readonly size = signal(25);

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

  protected readonly rows = computed(() => this.service.items());

  protected readonly net = computed(() => this.service.summary().net);

  constructor() {
    this.range.set(currentMonthRange());

    effect(() => {
      const range = this.range();
      this.service.setFilters({
        from: range?.from,
        to: range?.to,
        categoryId: this.categoryFilter() ?? undefined,
        kind: this.kindFilter() ?? undefined,
        page: this.page(),
        size: this.size(),
      });
    });
  }

  protected onRangeChange(value: Date[] | null): void {
    if (!value || value.length === 0 || !value[0]) {
      this.applyFilter(() => this.range.set(null));
      return;
    }

    const [start, end] = value;
    if (!end) {
      return;
    }
    this.applyFilter(() => this.range.set({ from: toIsoDate(start), to: toIsoDate(end) }));
  }

  protected onCategoryChange(categoryId: Uuid | null): void {
    this.applyFilter(() => this.categoryFilter.set(categoryId));
  }

  protected onKindChange(kind: TransactionKind | null): void {
    this.applyFilter(() => this.kindFilter.set(kind));
  }

  /** Fired for both page steps and rows-per-page changes; both repage server-side. */
  protected onPage(event: PaginatorState): void {
    this.size.set(event.rows ?? this.size());
    this.page.set(event.page ?? 0);
  }

  protected clearFilters(): void {
    this.applyFilter(() => {
      this.range.set(null);
      this.kindFilter.set(null);
      this.categoryFilter.set(null);
    });
  }

  /** A narrower filter can leave fewer rows than the current offset. */
  private applyFilter(change: () => void): void {
    change();
    this.page.set(0);
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

  protected currencyFor(tx: Transaction): string {
    return this.currencies.forSource(tx);
  }

  /**
   * The summary totals only have one currency when the filter narrows to a single account or
   * card; across a mixed selection the API has already summed them and this is a best effort.
   */
  protected readonly summaryCurrency = computed(() => {
    const { bankAccountId, creditCardId } = this.service.filters();
    return this.currencies.forSource({
      bankAccountId: bankAccountId ?? null,
      creditCardId: creditCardId ?? null,
    });
  });

  protected money(value: number): string {
    return formatMoney(Math.abs(value), this.summaryCurrency());
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
