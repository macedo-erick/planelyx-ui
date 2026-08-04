import { Component, computed, inject, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { BankAccount } from '../../shared/models/bank-account';
import { Uuid } from '../../shared/models/common';
import { AccountType } from '../../shared/models/enums';
import { FintrackCard } from '../../shared/ui/card';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { ACCOUNT_TYPE_LABELS } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { BankAccountFormDialog } from './bank-account-form-dialog';
import { BankAccountService } from './bank-account.service';

@Component({
  selector: 'fintrack-bank-accounts-page',
  imports: [
    Tag,
    Button,
    FintrackCard,
    FintrackPageHeader,
    FintrackEmptyState,
    BankAccountFormDialog,
  ],
  templateUrl: './bank-accounts-page.html',
})
export class BankAccountsPage {
  protected readonly service = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);
  private readonly confirm = inject(ConfirmationService);

  protected dialogOpen = signal(false);
  protected readonly selected = signal<BankAccount | null>(null);
  protected readonly accounts = computed(() => this.service.sorted());

  /** How many cards bill against each account — the thing a delete would take with it. */
  private readonly cardCounts = computed(() => {
    const counts = new Map<Uuid, number>();
    for (const card of this.cards.items()) {
      counts.set(card.bankAccountId, (counts.get(card.bankAccountId) ?? 0) + 1);
    }
    return counts;
  });

  protected typeLabel(type: AccountType): string {
    return ACCOUNT_TYPE_LABELS[type];
  }

  protected money(value: number, currency: string): string {
    return formatMoney(value, currency);
  }

  protected cardsLabel(accountId: Uuid): string {
    const count = this.cardCounts().get(accountId) ?? 0;
    return count === 1 ? '1 card' : `${count} cards`;
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(account: BankAccount): void {
    this.selected.set(account);
    this.dialogOpen.set(true);
  }

  protected confirmDelete(account: BankAccount): void {
    this.confirm.confirm({
      header: 'Delete account',
      message: `Permanently delete "${account.name}"? This cannot be undone, and any cards or transactions attached to it will be affected.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.remove(account.id).subscribe();
      },
    });
  }
}
