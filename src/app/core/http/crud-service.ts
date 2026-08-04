import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Uuid } from '../../shared/models/common';

/**
 * Shared shape for the three resources with plain CRUD (`bank-accounts`, `categories`,
 * `credit-cards`).
 *
 * Reads go through `httpResource` so the list is a signal the templates can read
 * directly. Mutations use `HttpClient` and return Observables — never promises — and
 * refresh the list via `tap`.
 *
 * Transactions, templates and invoices deviate from this shape (filters, no PUT,
 * pay/unpay) and are written out explicitly instead.
 */
export abstract class CrudService<TModel, TRequest> {
  protected readonly http = inject(HttpClient);
  private readonly baseUrl: string;

  /**
   * `baseUrl` is still undefined when this initializer runs, but the request function is
   * only invoked once effects flush — after the constructor has completed.
   */
  readonly resource = httpResource<TModel[]>(() => this.baseUrl, { defaultValue: [] });

  readonly items = computed(() => this.resource.value());
  readonly isLoading = computed(() => this.resource.isLoading());
  readonly hasError = computed(() => this.resource.error() !== undefined);

  protected constructor(resourcePath: string) {
    this.baseUrl = `${environment.apiUrl}/${resourcePath}`;
  }

  byId(id: Uuid): TModel | undefined {
    return this.items().find((item) => (item as { id: Uuid }).id === id);
  }

  create(request: TRequest): Observable<TModel> {
    return this.http.post<TModel>(this.baseUrl, request).pipe(tap(() => this.resource.reload()));
  }

  update(id: Uuid, request: TRequest): Observable<TModel> {
    return this.http
      .put<TModel>(`${this.baseUrl}/${id}`, request)
      .pipe(tap(() => this.resource.reload()));
  }

  remove(id: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(tap(() => this.resource.reload()));
  }

  reload(): void {
    this.resource.reload();
  }
}
