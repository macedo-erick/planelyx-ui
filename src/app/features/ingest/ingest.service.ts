import { HttpClient, HttpEvent, HttpEventType, httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { filter, map, Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Uuid } from '../../shared/models/common';
import {
  ConfirmRequest,
  ConfirmResult,
  DocumentDetail,
  IngestDocument,
  IngestResult,
  RollbackResult,
  StagedTransaction,
  StagedTransactionEdit,
  UploadProgress,
} from '../../shared/models/ingest';

/** Turns one HTTP event into an upload phase, or into nothing. */
function toProgress(event: HttpEvent<IngestResult>): UploadProgress | null {
  if (event.type === HttpEventType.UploadProgress) {
    if (event.total !== undefined && event.loaded >= event.total) {
      return { phase: 'reading' };
    }

    return {
      phase: 'sending',
      percent: event.total === undefined ? null : Math.round((event.loaded / event.total) * 100),
    };
  }

  if (event.type === HttpEventType.Response && event.body !== null) {
    return { phase: 'done', result: event.body };
  }

  return null;
}

/** The client for `planelyx-ocr`. */
@Service()
export class IngestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ocrUrl}/documents`;

  readonly resource = httpResource<IngestDocument[]>(() => this.baseUrl, { defaultValue: [] });

  readonly items = computed(() => this.resource.value());
  readonly isLoading = computed(() => this.resource.isLoading());
  readonly hasError = computed(() => this.resource.error() !== undefined);

  readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  readonly awaitingReview = computed(() => this.sorted().filter((d) => d.pendingCount > 0));

  private readonly openDocumentId = signal<Uuid | null>(null);

  readonly detail = httpResource<DocumentDetail | undefined>(() => {
    const id = this.openDocumentId();

    return id === null ? undefined : `${this.baseUrl}/${id}`;
  });

  readonly detailLoading = computed(() => this.detail.isLoading());

  open(id: Uuid): void {
    this.openDocumentId.set(id);
  }

  /** Uploads a statement. */
  upload(file: File, force = false): Observable<UploadProgress> {
    const body = new FormData();
    body.append('file', file, file.name);

    const url = force ? `${this.baseUrl}?force=true` : this.baseUrl;

    return this.http
      .post<IngestResult>(url, body, { observe: 'events', reportProgress: true })
      .pipe(
        map((event) => toProgress(event)),
        filter((progress): progress is UploadProgress => progress !== null),
        tap((progress) => {
          if (progress.phase === 'done') {
            this.reload();
          }
        }),
      );
  }

  /** Edits one staged line. The line becomes `edited`, which is distinct from untouched. */
  editLine(
    documentId: Uuid,
    transactionId: Uuid,
    edit: StagedTransactionEdit,
  ): Observable<StagedTransaction> {
    return this.http
      .patch<StagedTransaction>(`${this.baseUrl}/${documentId}/transactions/${transactionId}`, edit)
      .pipe(tap(() => this.reloadDetail()));
  }

  /** Rejects lines in bulk — the batch operation a sixty-line statement needs. */
  reject(documentId: Uuid, transactionIds: readonly Uuid[]): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/${documentId}/transactions/reject`, { ids: transactionIds })
      .pipe(tap(() => this.reloadAll()));
  }

  /** Files the selected lines to `planelyx-api`. */
  confirm(documentId: Uuid, request: ConfirmRequest): Observable<ConfirmResult> {
    return this.http
      .post<ConfirmResult>(`${this.baseUrl}/${documentId}/confirm`, request)
      .pipe(tap(() => this.reloadAll()));
  }

  /** Undoes a filed import, deleting the ledger transactions it created. Also per line. */
  rollback(documentId: Uuid): Observable<RollbackResult> {
    return this.http
      .post<RollbackResult>(`${this.baseUrl}/${documentId}/rollback`, null)
      .pipe(tap(() => this.reloadAll()));
  }

  /** Drops staged lines that were never filed. Filed ones are a rollback, not a discard. */
  discardStaging(documentId: Uuid): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${documentId}/staging`)
      .pipe(tap(() => this.reloadAll()));
  }

  /** Removes an import outright, staged lines and all. */
  delete(documentId: Uuid): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${documentId}`).pipe(tap(() => this.reload()));
  }

  /** The original file, for checking a line against what the issuer actually printed. */
  original(documentId: Uuid): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${documentId}/original`, { responseType: 'blob' });
  }

  reload(): void {
    this.resource.reload();
  }

  reloadDetail(): void {
    this.detail.reload();
  }

  private reloadAll(): void {
    this.reload();
    this.reloadDetail();
  }
}
