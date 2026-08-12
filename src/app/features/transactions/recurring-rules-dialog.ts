import { Component, computed, inject, model } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';

import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { RecurrenceType } from '../../shared/models/enums';
import { TransactionTemplate } from '../../shared/models/transaction-template';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxCategoryBadge } from '../../shared/ui/category-badge';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { shortDate } from '../../shared/util/date-format';
import { recurrenceTypeLabels } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CurrencyService } from '../bank-accounts/currency.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { TransactionTemplateService } from './transaction-template.service';

/** Management surface for recurring rules. */
@Component({
  selector: 'planelyx-recurring-rules-dialog',
  imports: [Dialog, Tag, Button, PlanelyxCard, PlanelyxEmptyState, PlanelyxCategoryBadge],
  templateUrl: './recurring-rules-dialog.html',
})
export class RecurringRulesDialog {
  protected readonly service = inject(TransactionTemplateService);
  private readonly accounts = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);
  private readonly confirm = inject(ConfirmationService);
  private readonly currencies = inject(CurrencyService);

  readonly visible = model.required<boolean>();

  protected readonly t = injectTranslate();
  private readonly recurrenceLabels = recurrenceTypeLabels();

  protected readonly templates = computed(() => this.service.sorted());

  protected recurrenceLabel(type: RecurrenceType): string {
    return this.recurrenceLabels()[type];
  }

  protected category(id: Uuid): Category | undefined {
    return this.categories.byIdMap().get(id);
  }

  protected sourceName(tpl: TransactionTemplate): string {
    if (tpl.creditCardId) {
      return this.cards.byIdMap().get(tpl.creditCardId)?.name ?? this.t('dashboard.card');
    }
    return (
      this.accounts.byIdMap().get(tpl.bankAccountId ?? '')?.name ?? this.t('dashboard.account')
    );
  }

  protected money(value: number, tpl: TransactionTemplate): string {
    return formatMoney(value, this.currencies.forSource(tpl));
  }

  protected shortDate(iso: IsoDate): string {
    return shortDate(iso);
  }

  /** "3 / 12 generated" for a bounded rule, "3 generated" for an open-ended one. */
  protected generatedLabel(tpl: TransactionTemplate): string {
    return tpl.totalOccurrences
      ? this.t('recurring.generatedOf', {
          done: tpl.occurrencesGenerated,
          total: tpl.totalOccurrences,
        })
      : this.t('recurring.generated', { done: tpl.occurrencesGenerated });
  }

  protected confirmDeactivate(tpl: TransactionTemplate): void {
    this.confirm.confirm({
      header: this.t('recurring.stopHeader'),
      message: this.t('recurring.stopMessage', { description: tpl.description }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: this.t('recurring.stop'), severity: 'danger' },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.service.deactivate(tpl.id).subscribe();
      },
    });
  }
}
