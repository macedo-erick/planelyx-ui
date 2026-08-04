import { Component, computed, inject, model } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { RecurrenceType } from '../../shared/models/enums';
import { TransactionTemplate } from '../../shared/models/transaction-template';
import { FintrackCategoryBadge } from '../../shared/ui/category-badge';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { fromIsoDate } from '../../shared/util/date';
import { RECURRENCE_TYPE_LABELS } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { TransactionTemplateService } from './transaction-template.service';
import { StyleClass } from 'primeng/styleclass';

/**
 * Management surface for recurring rules.
 *
 * Rules are created from the transaction form (a transaction that repeats), so this only
 * lists them and stops them — which is all the API allows, since there is no update
 * endpoint and DELETE is a soft deactivate.
 */
@Component({
  selector: 'fintrack-recurring-rules-dialog',
  imports: [Dialog, TableModule, Tag, Button, FintrackEmptyState, FintrackCategoryBadge, StyleClass],
  templateUrl: './recurring-rules-dialog.html',
})
export class RecurringRulesDialog {
  protected readonly service = inject(TransactionTemplateService);
  private readonly accounts = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);
  private readonly confirm = inject(ConfirmationService);

  readonly visible = model.required<boolean>();

  protected readonly templates = computed(() => this.service.sorted());

  protected recurrenceLabel(type: RecurrenceType): string {
    return RECURRENCE_TYPE_LABELS[type];
  }

  protected category(id: Uuid): Category | undefined {
    return this.categories.byIdMap().get(id);
  }

  protected sourceName(tpl: TransactionTemplate): string {
    if (tpl.creditCardId) {
      return this.cards.byIdMap().get(tpl.creditCardId)?.name ?? 'Card';
    }
    return this.accounts.byIdMap().get(tpl.bankAccountId ?? '')?.name ?? 'Account';
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected shortDate(iso: IsoDate): string {
    const date = fromIsoDate(iso);
    return date ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : iso;
  }

  protected confirmDeactivate(tpl: TransactionTemplate): void {
    this.confirm.confirm({
      header: 'Stop this rule',
      message: `Stop generating "${tpl.description}"? Transactions already created are kept.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Stop', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.deactivate(tpl.id).subscribe();
      },
    });
  }
}
