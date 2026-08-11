import { Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';

import { injectTranslate } from '../../core/i18n/translate';
import { Uuid } from '../../shared/models/common';
import { CreditCard } from '../../shared/models/credit-card';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CreditCardFormDialog } from './credit-card-form-dialog';
import { CreditCardService } from './credit-card.service';

@Component({
  selector: 'planelyx-credit-cards-page',
  imports: [
    Button,
    ProgressBar,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
    CreditCardFormDialog,
  ],
  templateUrl: './credit-cards-page.html',
})
export class CreditCardsPage {
  protected readonly service = inject(CreditCardService);
  private readonly accounts = inject(BankAccountService);
  protected readonly t = injectTranslate();

  protected dialogOpen = signal(false);
  protected readonly selected = signal<CreditCard | null>(null);
  protected readonly cards = computed(() => this.service.sorted());
  protected readonly hasAccounts = computed(() => this.accounts.items().length > 0);

  /** e.g. "R$ 400 of R$ 5.000 used · closes day 10 · due day 17". */
  protected usedSummary(card: CreditCard): string {
    return this.t('cards.usedSummary', {
      used: formatMoney(card.usedLimit),
      limit: formatMoney(card.creditLimit),
      closing: card.closingDay,
      due: card.dueDay,
    });
  }

  protected accountName(id: Uuid): string {
    return this.accounts.byIdMap().get(id)?.name ?? '—';
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  /** How much of the limit is committed. */
  protected usedPercent(card: CreditCard): number {
    if (card.creditLimit <= 0) {
      return card.usedLimit > 0 ? 100 : 0;
    }
    return (card.usedLimit / card.creditLimit) * 100;
  }

  /** The bar itself saturates; only the label carries the overflow. */
  protected barValue(card: CreditCard): number {
    return Math.min(Math.max(this.usedPercent(card), 0), 100);
  }

  protected usedPercentLabel(card: CreditCard): string {
    return `${this.usedPercent(card).toFixed(2)}%`;
  }

  /** `undefined` leaves the theme's primary colour; over the limit it goes red. */
  protected barColor(card: CreditCard): string | undefined {
    return this.usedPercent(card) > 100 ? 'var(--p-red-500)' : undefined;
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(card: CreditCard): void {
    this.selected.set(card);
    this.dialogOpen.set(true);
  }
}
