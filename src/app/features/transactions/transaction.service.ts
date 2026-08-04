import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Uuid } from '../../shared/models/common';
import { TransactionScope } from '../../shared/models/enums';
import { emptyPage, PageResponse } from '../../shared/models/page';
import {
  Transaction,
  TransactionFilters,
  TransactionRequest,
  TransactionSummary,
  TransactionUpdateRequest,
} from '../../shared/models/transaction';
import { toHttpParams } from '../../shared/util/http-params';

@Service()
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/transactions`;

  /** Filters and paging both live here. Changing this re-issues both requests automatically. */
  readonly filters = signal<TransactionFilters>({});

  readonly resource = httpResource<PageResponse<Transaction>>(
    () => ({ url: this.baseUrl, params: toHttpParams({ ...this.filters() }) }),
    { defaultValue: emptyPage<Transaction>() },
  );

  /**
   * Totals for the whole selection, which the page alone cannot supply.
   *
   * Paging must not re-issue it, so `page` and `size` are stripped — otherwise every page
   * change would refetch a figure that did not move.
   */
  readonly summaryResource = httpResource<TransactionSummary>(() => {
    const current = this.filters();
    return {
      url: `${this.baseUrl}/summary`,
      params: toHttpParams({
        bankAccountId: current.bankAccountId,
        creditCardId: current.creditCardId,
        categoryId: current.categoryId,
        kind: current.kind,
        from: current.from,
        to: current.to,
      }),
    };
  });

  /** The current page of results. Ordering is the API's: newest first. */
  readonly items = computed(() => this.resource.value().content);
  readonly totalElements = computed(() => this.resource.value().totalElements);
  readonly isLoading = computed(() => this.resource.isLoading());

  readonly summary = computed<TransactionSummary>(() =>
    this.summaryResource.hasValue()
      ? this.summaryResource.value()
      : { totalIncome: 0, totalExpense: 0, net: 0, count: 0 },
  );

  setFilters(filters: TransactionFilters): void {
    this.filters.set(filters);
  }

  create(request: TransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(this.baseUrl, request).pipe(tap(() => this.reload()));
  }

  /**
   * PUT accepts a narrower payload — kind and the account/card link are immutable. `scope` on
   * the request widens the edit across a series.
   */
  update(id: Uuid, request: TransactionUpdateRequest): Observable<Transaction> {
    return this.http
      .put<Transaction>(`${this.baseUrl}/${id}`, request)
      .pipe(tap(() => this.reload()));
  }

  /** `scope` only reaches beyond this row for a transaction belonging to a template. */
  remove(id: Uuid, scope?: TransactionScope): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`, { params: toHttpParams({ scope }) })
      .pipe(tap(() => this.reload()));
  }

  reload(): void {
    this.resource.reload();
    this.summaryResource.reload();
  }
}
