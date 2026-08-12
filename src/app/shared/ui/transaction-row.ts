import { Component, computed, input, output } from '@angular/core';

import { environment } from '../../../environments/environment';
import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../models/category';
import { Transaction } from '../models/transaction';
import { longDate } from '../util/date-format';
import { defaultCategoryNames } from '../util/enum-labels';
import { formatMoney } from '../util/money';
import { PlanelyxCategoryBadge } from './category-badge';

/** One transaction as a list row. */
@Component({
  selector: 'planelyx-transaction-row',
  imports: [PlanelyxCategoryBadge],
  templateUrl: './transaction-row.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PlanelyxTransactionRow {
  readonly transaction = input.required<Transaction>();
  readonly category = input<Category | undefined>(undefined);
  readonly secondary = input('');
  readonly clickable = input(true);
  /** Resolved by the page from the account or card the row settles against. */
  readonly currency = input(environment.defaultCurrency);

  readonly edit = output<Transaction>();

  protected readonly t = injectTranslate();
  private readonly translateCategory = defaultCategoryNames();

  protected readonly locked = computed(() => this.category()?.system === true);

  protected readonly interactive = computed(() => this.clickable() && !this.locked());

  protected readonly unpaid = computed(() => {
    const tx = this.transaction();
    return tx.kind === 'ACCOUNT_DEBIT' && !tx.paid;
  });

  protected readonly categoryName = computed(() => {
    const category = this.category();
    return category
      ? this.translateCategory()(category.name)
      : this.t('categoryDefaults.Uncategorised');
  });

  protected readonly installment = computed(() => {
    const tx = this.transaction();
    return tx.installmentNumber ? `${tx.installmentNumber}/${tx.totalInstallments}` : null;
  });

  protected readonly amount = computed(() => {
    const tx = this.transaction();
    const sign = tx.kind === 'ACCOUNT_CREDIT' ? '+' : '−';
    return `${sign}${formatMoney(Math.abs(tx.amount), this.currency())}`;
  });

  protected readonly amountClasses = computed(() =>
    this.transaction().kind === 'ACCOUNT_CREDIT' ? 'text-green-600' : 'text-red-500',
  );

  protected readonly date = computed(() => longDate(this.transaction().purchaseDate));
}
