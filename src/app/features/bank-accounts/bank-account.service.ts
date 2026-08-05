import { httpResource } from '@angular/common/http';
import { computed, Service } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CrudService } from '../../core/http/crud-service';
import { environment } from '../../../environments/environment';
import {
  BalanceAdjustmentRequest,
  BankAccount,
  BankAccountBalance,
  BankAccountRequest,
} from '../../shared/models/bank-account';
import { Money, Uuid } from '../../shared/models/common';
import { Transaction } from '../../shared/models/transaction';
import { SelectOption } from '../../shared/util/enum-labels';

@Service()
export class BankAccountService extends CrudService<BankAccount, BankAccountRequest> {
  constructor() {
    super('bank-accounts');
  }

  private readonly balancesUrl = `${environment.apiUrl}/bank-accounts/balances`;

  /**
   * Live balances, fetched separately from the accounts themselves.
   *
   * They are a different query on the server and change for reasons the account list never
   * sees — posting a transaction moves a balance without touching the account — so they get
   * their own resource rather than a field on `BankAccount`.
   */
  private readonly balancesResource = httpResource<BankAccountBalance[]>(() => this.balancesUrl, {
    defaultValue: [],
  });

  readonly sorted = computed(() => [...this.items()].sort((a, b) => a.name.localeCompare(b.name)));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.sorted().map((account) => ({
      label: `${account.name} · ${account.bankName}`,
      value: account.id,
    })),
  );

  readonly byIdMap = computed(() => new Map(this.items().map((a) => [a.id, a])));

  readonly balanceById = computed(
    () => new Map(this.balancesResource.value().map((b) => [b.bankAccountId, b.balance])),
  );

  /** The date every balance above is stated as of. Null until the first response lands. */
  readonly balancesAsOf = computed(() => this.balancesResource.value()[0]?.asOf ?? null);

  readonly balancesLoading = computed(() => this.balancesResource.isLoading());

  /**
   * Sets the balance to `targetBalance` by posting the difference as a transaction.
   *
   * Resolves to null when the balance already matched — the API answers 204 rather than
   * writing a transaction worth nothing.
   */
  adjustBalance(id: Uuid, request: BalanceAdjustmentRequest): Observable<Transaction | null> {
    return this.http
      .post<Transaction | null>(`${environment.apiUrl}/bank-accounts/${id}/adjust-balance`, request)
      .pipe(tap(() => this.reload()));
  }

  balanceFor(id: Uuid): Money | undefined {
    return this.balanceById().get(id);
  }

  /**
   * A balance moves whenever a transaction is posted, which happens on pages that never touch
   * this service. Anything displaying balances refetches them on entry rather than trusting
   * what was cached the last time accounts were listed.
   */
  reloadBalances(): void {
    this.balancesResource.reload();
  }

  /** Balances move with the accounts, so the two resources are always refreshed together. */
  override reload(): void {
    super.reload();
    this.reloadBalances();
  }
}
