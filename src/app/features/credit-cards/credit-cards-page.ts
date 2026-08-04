import { Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';

import { Uuid } from '../../shared/models/common';
import { CreditCard } from '../../shared/models/credit-card';
import { FintrackCard } from '../../shared/ui/card';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CreditCardFormDialog } from './credit-card-form-dialog';
import { CreditCardService } from './credit-card.service';

@Component({
  selector: 'fintrack-credit-cards-page',
  imports: [
    Button,
    ProgressBar,
    FintrackCard,
    FintrackPageHeader,
    FintrackEmptyState,
    CreditCardFormDialog,
  ],
  templateUrl: './credit-cards-page.html',
})
export class CreditCardsPage {
  protected readonly service = inject(CreditCardService);
  private readonly accounts = inject(BankAccountService);

  protected dialogOpen = signal(false);
  protected readonly selected = signal<CreditCard | null>(null);
  protected readonly cards = computed(() => this.service.sorted());
  protected readonly hasAccounts = computed(() => this.accounts.items().length > 0);

  protected accountName(id: Uuid): string {
    return this.accounts.byIdMap().get(id)?.name ?? '—';
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  /**
   * How much of the limit is committed. Can exceed 100% — the server does not stop a
   * charge that takes the card past its limit, so the number has to be able to say so.
   */
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
