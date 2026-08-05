import { Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { injectTranslate } from '../../core/i18n/translate';
import { BankAccount } from '../../shared/models/bank-account';
import { Money, Uuid } from '../../shared/models/common';
import { AccountType } from '../../shared/models/enums';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { shortDate } from '../../shared/util/date-format';
import { accountTypeLabels } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { BankAccountFormDialog } from './bank-account-form-dialog';
import { BankAccountService } from './bank-account.service';

@Component({
  selector: 'planelyx-bank-accounts-page',
  imports: [
    Tag,
    Button,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
    BankAccountFormDialog,
  ],
  templateUrl: './bank-accounts-page.html',
})
export class BankAccountsPage {
  protected readonly service = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);
  protected readonly t = injectTranslate();
  private readonly typeLabels = accountTypeLabels();

  protected dialogOpen = signal(false);
  protected readonly selected = signal<BankAccount | null>(null);
  protected readonly accounts = computed(() => this.service.sorted());

  constructor() {
    // Transactions posted on other pages move these balances without this service ever
    // hearing about it, so what was cached last visit cannot be trusted.
    this.service.reloadBalances();
  }

  /** How many cards bill against each account — the thing a delete would take with it. */
  private readonly cardCounts = computed(() => {
    const counts = new Map<Uuid, number>();
    for (const card of this.cards.items()) {
      counts.set(card.bankAccountId, (counts.get(card.bankAccountId) ?? 0) + 1);
    }
    return counts;
  });

  protected typeLabel(type: AccountType): string {
    return this.typeLabels()[type];
  }

  protected money(value: number, currency: string): string {
    return formatMoney(value, currency);
  }

  /**
   * The account's balance as of the end of this month, or its starting figure while the
   * balances are still in flight — never a blank where an amount belongs.
   */
  protected balance(account: BankAccount): Money {
    return this.service.balanceFor(account.id) ?? account.initialBalance;
  }

  /** e.g. "Projected to 31 Aug" — the balance is a forecast to the end of the month. */
  protected asOfLabel(): string | null {
    const asOf = this.service.balancesAsOf();

    return asOf ? this.t('accounts.projectedTo', { date: shortDate(asOf) }) : null;
  }

  protected cardsLabel(accountId: Uuid): string {
    const count = this.cardCounts().get(accountId) ?? 0;

    return count === 1 ? this.t('accounts.cardCountOne') : this.t('accounts.cardCount', { count });
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(account: BankAccount): void {
    this.selected.set(account);
    this.dialogOpen.set(true);
  }
}
