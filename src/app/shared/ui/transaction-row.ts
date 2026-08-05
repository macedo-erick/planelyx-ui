import { Component, computed, input, output } from '@angular/core';

import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../models/category';
import { Transaction } from '../models/transaction';
import { longDate } from '../util/date-format';
import { defaultCategoryNames } from '../util/enum-labels';
import { formatMoney } from '../util/money';
import { PlanelyxCategoryBadge } from './category-badge';

/**
 * One transaction as a list row: coloured category circle, description over a muted
 * category line, and the amount over its date on the right.
 *
 * Shared by the transactions page, the monthly invoice view and the invoice detail page —
 * a charge and an account transaction are the same shape, so they read the same way.
 *
 * The row is a `<button>` rather than a `<div>` with a click handler so that click-to-edit
 * is reachable by keyboard for free.
 */
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
  /** Undefined when the category was deleted but the transaction still references it. */
  readonly category = input<Category | undefined>(undefined);
  /**
   * Appended after the category name. The card or account on the transactions page; left
   * empty inside an invoice, where the card is already the heading.
   */
  readonly secondary = input('');
  readonly clickable = input(true);

  /** Named `edit` rather than `select` — `select` is a native DOM event. */
  readonly edit = output<Transaction>();

  protected readonly t = injectTranslate();
  private readonly translateCategory = defaultCategoryNames();

  protected readonly categoryName = computed(() => {
    const category = this.category();
    return category
      ? this.translateCategory()(category.name)
      : this.t('categoryDefaults.Uncategorised');
  });

  /** "2/6" for an installment, nothing otherwise. */
  protected readonly installment = computed(() => {
    const tx = this.transaction();
    return tx.installmentNumber ? `${tx.installmentNumber}/${tx.totalInstallments}` : null;
  });

  protected readonly amount = computed(() => {
    const tx = this.transaction();
    return `${tx.kind === 'ACCOUNT_CREDIT' ? '+' : '−'}${formatMoney(Math.abs(tx.amount))}`;
  });

  protected readonly amountClasses = computed(() =>
    this.transaction().kind === 'ACCOUNT_CREDIT' ? 'text-green-600' : 'text-red-500',
  );

  protected readonly date = computed(() => longDate(this.transaction().transactionDate));
}
