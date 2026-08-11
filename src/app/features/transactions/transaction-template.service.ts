import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Uuid } from '../../shared/models/common';
import {
  TransactionTemplate,
  TransactionTemplateRequest,
} from '../../shared/models/transaction-template';

/** Recurring rules — both "fixed" entries and installment purchases. */
@Service()
export class TransactionTemplateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/transaction-templates`;

  readonly resource = httpResource<TransactionTemplate[]>(() => this.baseUrl, {
    defaultValue: [],
  });

  readonly items = computed(() => this.resource.value());
  readonly isLoading = computed(() => this.resource.isLoading());

  readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => b.startDate.localeCompare(a.startDate)),
  );

  readonly active = computed(() => this.sorted().filter((t) => t.active));

  readonly byIdMap = computed(() => new Map(this.items().map((t) => [t.id, t])));

  create(request: TransactionTemplateRequest): Observable<TransactionTemplate> {
    return this.http
      .post<TransactionTemplate>(this.baseUrl, request)
      .pipe(tap(() => this.resource.reload()));
  }

  /** Soft delete: sets `active = false`, leaving already-generated transactions in place. */
  deactivate(id: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(tap(() => this.resource.reload()));
  }

  reload(): void {
    this.resource.reload();
  }
}
