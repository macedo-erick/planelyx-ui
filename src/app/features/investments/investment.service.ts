import { httpResource } from '@angular/common/http';
import { computed, Service } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CrudService } from '../../core/http/crud-service';
import { environment } from '../../../environments/environment';
import { BalanceAdjustmentRequest } from '../../shared/models/bank-account';
import { Money, Uuid } from '../../shared/models/common';
import {
  Investment,
  InvestmentBalance,
  InvestmentMovementRequest,
  InvestmentRequest,
} from '../../shared/models/investment';
import { Transaction } from '../../shared/models/transaction';
import { SelectOption } from '../../shared/util/enum-labels';
import { qualifiedLabel } from '../../shared/util/option-label';

@Service()
export class InvestmentService extends CrudService<Investment, InvestmentRequest> {
  constructor() {
    super('investments');
  }

  private readonly investmentsUrl = `${environment.apiUrl}/investments`;

  private readonly balancesResource = httpResource<InvestmentBalance[]>(
    () => `${this.investmentsUrl}/balances`,
    { defaultValue: [] },
  );

  readonly sorted = computed(() => [...this.items()].sort((a, b) => a.name.localeCompare(b.name)));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.sorted().map((investment) => ({
      label: qualifiedLabel(investment.name, investment.institution),
      value: investment.id,
    })),
  );

  readonly byIdMap = computed(() => new Map(this.items().map((i) => [i.id, i])));

  readonly balanceById = computed(
    () => new Map(this.balancesResource.value().map((b) => [b.investmentId, b.balance])),
  );

  readonly contributedById = computed(
    () => new Map(this.balancesResource.value().map((b) => [b.investmentId, b.contributed])),
  );

  readonly balancesAsOf = computed(() => this.balancesResource.value()[0]?.asOf ?? null);

  readonly balancesLoading = computed(() => this.balancesResource.isLoading());

  readonly investedTotal = computed(() =>
    this.balancesResource.value().reduce((total, b) => total + b.balance, 0),
  );

  readonly contributedTotal = computed(() =>
    this.balancesResource.value().reduce((total, b) => total + b.contributed, 0),
  );

  balanceFor(id: Uuid): Money | undefined {
    return this.balanceById().get(id);
  }

  contributedFor(id: Uuid): Money | undefined {
    return this.contributedById().get(id);
  }

  /** Lowers the account and raises the investment in one row. Never an expense. */
  contribute(id: Uuid, request: InvestmentMovementRequest): Observable<Transaction> {
    return this.postTo(`${id}/contribute`, request);
  }

  /** The same in reverse. Refused above what the investment holds on that date. */
  redeem(id: Uuid, request: InvestmentMovementRequest): Observable<Transaction> {
    return this.postTo(`${id}/redeem`, request);
  }

  /** Records the difference against `targetBalance` as yield or as a loss. */
  adjustBalance(id: Uuid, request: BalanceAdjustmentRequest): Observable<Transaction | null> {
    return this.postTo(`${id}/adjust-balance`, request);
  }

  private postTo<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.investmentsUrl}/${path}`, body).pipe(tap(() => this.reload()));
  }

  reloadBalances(): void {
    this.balancesResource.reload();
  }

  /** A balance moves whenever a movement is posted, so the two refresh together. */
  override reload(): void {
    super.reload();
    this.reloadBalances();
  }
}
