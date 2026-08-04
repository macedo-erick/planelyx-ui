import { HttpClient, httpResource } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Uuid } from '../../shared/models/common';
import { Invoice, InvoiceFilters } from '../../shared/models/invoice';
import { toHttpParams } from '../../shared/util/http-params';

/**
 * Invoices are system-generated when a card charge is posted — there is no create,
 * update or delete. The only mutations are pay and unpay.
 */
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

  /** Most recent billing period first. */
  readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => b.billingPeriodStart.localeCompare(a.billingPeriodStart)),
  );

  readonly unpaid = computed(() => this.sorted().filter((i) => i.status !== 'PAID'));

  setFilters(filters: InvoiceFilters): void {
    this.filters.set(filters);
  }

  pay(id: Uuid): Observable<Invoice> {
    return this.http
      .post<Invoice>(`${this.baseUrl}/${id}/pay`, null)
      .pipe(tap(() => this.resource.reload()));
  }

  unpay(id: Uuid): Observable<Invoice> {
    return this.http
      .post<Invoice>(`${this.baseUrl}/${id}/unpay`, null)
      .pipe(tap(() => this.resource.reload()));
  }

  reload(): void {
    this.resource.reload();
  }
}
