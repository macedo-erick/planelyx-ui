import { HttpClient, httpResource } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Uuid } from '../../shared/models/common';
import {
  Transaction,
  TransactionFilters,
  TransactionRequest,
  TransactionUpdateRequest,
} from '../../shared/models/transaction';
import { toHttpParams } from '../../shared/util/http-params';

@Service()
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/transactions`;

  /** Server-side filters. Changing this re-issues the request automatically. */
  readonly filters = signal<TransactionFilters>({});

  readonly resource = httpResource<Transaction[]>(
    () => ({ url: this.baseUrl, params: toHttpParams({ ...this.filters() }) }),
    { defaultValue: [] },
  );

  readonly items = computed(() => this.resource.value());
  readonly isLoading = computed(() => this.resource.isLoading());

  /** Newest first — the API returns no ordering of its own. */
  readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)),
  );

  setFilters(filters: TransactionFilters): void {
    this.filters.set(filters);
  }

  create(request: TransactionRequest): Observable<Transaction> {
    return this.http
      .post<Transaction>(this.baseUrl, request)
      .pipe(tap(() => this.resource.reload()));
  }

  /** PUT accepts a narrower payload — kind and the account/card link are immutable. */
  update(id: Uuid, request: TransactionUpdateRequest): Observable<Transaction> {
    return this.http
      .put<Transaction>(`${this.baseUrl}/${id}`, request)
      .pipe(tap(() => this.resource.reload()));
  }

  remove(id: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(tap(() => this.resource.reload()));
  }

  reload(): void {
    this.resource.reload();
  }
}
