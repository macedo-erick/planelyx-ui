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
import { qualifiedLabel } from '../../shared/util/option-label';

@Service()
export class BankAccountService extends CrudService<BankAccount, BankAccountRequest> {
  constructor() {
    super('bank-accounts');
  }

  private readonly balancesUrl = `${environment.apiUrl}/bank-accounts/balances`;

  private readonly balancesResource = httpResource<BankAccountBalance[]>(() => this.balancesUrl, {
    defaultValue: [],
  });

  readonly sorted = computed(() => [...this.items()].sort((a, b) => a.name.localeCompare(b.name)));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.sorted().map((account) => ({
      label: qualifiedLabel(account.name, account.bankName),
      value: account.id,
    })),
  );

  readonly byIdMap = computed(() => new Map(this.items().map((a) => [a.id, a])));

  readonly balanceById = computed(
    () => new Map(this.balancesResource.value().map((b) => [b.bankAccountId, b.balance])),
  );

  readonly balancesAsOf = computed(() => this.balancesResource.value()[0]?.asOf ?? null);

  readonly balancesLoading = computed(() => this.balancesResource.isLoading());

  /** Sets the balance to `targetBalance` by posting the difference as a transaction. */
  adjustBalance(id: Uuid, request: BalanceAdjustmentRequest): Observable<Transaction | null> {
    return this.http
      .post<Transaction | null>(`${environment.apiUrl}/bank-accounts/${id}/adjust-balance`, request)
      .pipe(tap(() => this.reload()));
  }

  balanceFor(id: Uuid): Money | undefined {
    return this.balanceById().get(id);
  }

  /** A balance moves whenever a transaction is posted. */
  reloadBalances(): void {
    this.balancesResource.reload();
  }

  /** Balances move with the accounts, so the two resources are always refreshed together. */
  override reload(): void {
    super.reload();
    this.reloadBalances();
  }
}
