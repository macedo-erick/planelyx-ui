import { Component, computed, input, output } from '@angular/core';

import { environment } from '../../../environments/environment';
import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../models/category';
import { flowSign, incomeSign, isDerived, isSpending } from '../models/enums';
import { Transaction } from '../models/transaction';
import { longDate } from '../util/date-format';
import { defaultCategoryNames, transactionKindLabels } from '../util/enum-labels';
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
  private readonly kindLabels = transactionKindLabels();

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

  /** The API writes derived rows' description in English; their kind name is localized instead. */
  protected readonly description = computed(() => {
    const tx = this.transaction();
    return isDerived(tx.kind) ? this.kindLabels()[tx.kind] : tx.description;
  });

  protected readonly installment = computed(() => {
    const tx = this.transaction();
    return tx.installmentNumber ? `${tx.installmentNumber}/${tx.totalInstallments}` : null;
  });

  protected readonly amount = computed(() => {
    const tx = this.transaction();
    const sign = flowSign(tx.kind) > 0 ? '+' : '−';
    return `${sign}${formatMoney(Math.abs(tx.amount), this.currency())}`;
  });

  /**
   * Colour says whether the row left the owner richer or poorer, which is not the same question as
   * which way the money went: a transfer is neither, and only its sign says where it moved. Red
   * therefore covers spending and a market loss alike, though only the first is an expense.
   */
  protected readonly amountClasses = computed(() => {
    const kind = this.transaction().kind;

    if (incomeSign(kind) > 0) {
      return 'text-green-600';
    }

    return incomeSign(kind) < 0 || isSpending(kind) ? 'text-red-500' : 'text-[var(--p-text-color)]';
  });

  protected readonly date = computed(() => longDate(this.transaction().purchaseDate));
}
