import { computed, inject, Service } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Uuid } from '../../shared/models/common';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { BankAccountService } from './bank-account.service';

/** The account/card pair a figure hangs off, which is what fixes its currency. */
export interface CurrencySource {
  readonly bankAccountId: Uuid | null;
  readonly creditCardId: Uuid | null;
}

/**
 * Resolves the currency a figure is denominated in. Only `BankAccount` carries one, so
 * everything else resolves back to the account it settles against.
 *
 * Amounts the API has already summed across accounts — dashboard totals, the transaction
 * summary, category breakdowns — have no single currency and are not resolvable here. Those
 * keep the configured fallback, which is only correct while a user holds one currency.
 */
@Service()
export class CurrencyService {
  private readonly accounts = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);

  /** For figures the API reports without a currency of their own. */
  readonly fallback = environment.defaultCurrency;

  private readonly accountCurrency = computed(
    () => new Map(this.accounts.items().map((account) => [account.id, account.currency])),
  );

  forAccount(id: Uuid | null | undefined): string {
    return (id ? this.accountCurrency().get(id) : undefined) ?? this.fallback;
  }

  /** A card is billed in the currency of the account it settles against. */
  forCard(id: Uuid | null | undefined): string {
    const card = id ? this.cards.byIdMap().get(id) : undefined;
    return this.forAccount(card?.bankAccountId);
  }

  /** Whichever side the transaction, template, or charge hangs off. */
  forSource(source: CurrencySource | null | undefined): string {
    if (!source) {
      return this.fallback;
    }
    return source.creditCardId
      ? this.forCard(source.creditCardId)
      : this.forAccount(source.bankAccountId);
  }
}
