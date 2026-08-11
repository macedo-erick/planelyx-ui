import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Money, Uuid } from '../../shared/models/common';
import { Invoice, InvoiceFilters } from '../../shared/models/invoice';
import { toHttpParams } from '../../shared/util/http-params';

/** Invoices are system-generated when a card charge is posted — there is no create or update. */
@Service()
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/invoices`;

  readonly filters = signal<InvoiceFilters>({});

  readonly resource = httpResource<Invoice[]>(
    () => ({ url: this.baseUrl, params: toHttpParams({ ...this.filters() }) }),
    { defaultValue: [] },
  );

  readonly items = computed(() => this.resource.value());
  readonly isLoading = computed(() => this.resource.isLoading());

  readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth)),
  );

  readonly unpaid = computed(() => this.sorted().filter((i) => i.status !== 'PAID'));

  setFilters(filters: InvoiceFilters): void {
    this.filters.set(filters);
  }

  /** Marks the invoice settled. */
  pay(id: Uuid, description: string): Observable<Invoice> {
    return this.http
      .post<Invoice>(`${this.baseUrl}/${id}/pay`, { description })
      .pipe(tap(() => this.resource.reload()));
  }

  /** Sets the invoice total to `targetAmount`. */
  adjust(id: Uuid, targetAmount: Money, description: string): Observable<Invoice> {
    return this.http
      .post<Invoice>(`${this.baseUrl}/${id}/adjust`, { targetAmount, description })
      .pipe(tap(() => this.resource.reload()));
  }

  unpay(id: Uuid): Observable<Invoice> {
    return this.http
      .post<Invoice>(`${this.baseUrl}/${id}/unpay`, null)
      .pipe(tap(() => this.resource.reload()));
  }

  /** Removes the invoice and every charge on it. */
  remove(id: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(tap(() => this.resource.reload()));
  }

  reload(): void {
    this.resource.reload();
  }
}
