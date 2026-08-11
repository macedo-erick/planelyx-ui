import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';

import { injectTranslate } from '../../core/i18n/translate';
import { IngestDocument, IngestDocumentStatus, UploadProgress } from '../../shared/models/ingest';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { dateTime } from '../../shared/util/date-format';
import { IngestService } from './ingest.service';

/**
 * The import queue: what has been ingested, and what still needs a decision.
 *
 * Deliberately not a place where anything reaches the ledger. Uploading only stages, and every
 * write goes through the review screen — so this page can be used freely without it becoming a
 * way to file a statement nobody has read.
 */
@Component({
  selector: 'planelyx-ingest-page',
  imports: [
    Button,
    Tag,
    ProgressBar,
    RouterLink,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
  ],
  templateUrl: './ingest-page.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class IngestPage {
  protected readonly service = inject(IngestService);
  private readonly messages = inject(MessageService);
  protected readonly t = injectTranslate();

  /**
   * The import in flight, or null.
   *
   * Held as the progress itself rather than a boolean so the template can say *which* phase it is
   * in. An import is not a quick round trip: the request is held open while `planelyx-ocr` reads
   * the statement, and for one no deterministic parser recognises that includes a model call. A
   * spinner alone leaves the user unsure whether anything is happening, which is what gets a file
   * uploaded twice.
   */
  protected readonly upload = signal<UploadProgress | null>(null);
  /** Empty rather than null: it is only read while an import is in flight, and the translation
   * parameter takes a string. */
  protected readonly uploadingName = signal('');

  protected readonly uploading = computed(() => this.upload() !== null);
  protected readonly documents = computed(() => this.service.sorted());

  /** Null while the file is still going up, which is what makes the bar indeterminate. */
  protected readonly uploadPercent = computed(() => {
    const progress = this.upload();

    return progress?.phase === 'sending' ? progress.percent : null;
  });

  protected uploadMessage(): string {
    return this.upload()?.phase === 'sending'
      ? this.t('ingest.uploadingSending')
      : this.t('ingest.uploadingReading');
  }

  protected when(value: string): string {
    return dateTime(value);
  }

  protected statusLabel(status: IngestDocumentStatus): string {
    return this.t(`ingest.status.${status}`);
  }

  /**
   * `unsupported` is a warning rather than an error: nothing went wrong, no parser simply
   * recognised the issuer yet. The original is kept and can be imported again once one exists.
   */
  protected statusSeverity(
    status: IngestDocumentStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'reviewed':
        return 'success';
      case 'processed':
        return 'info';
      case 'failed':
        return 'danger';
      case 'unsupported':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  /** Lines waiting on a human, which is what makes a document worth opening. */
  protected pendingLabel(document: IngestDocument): string | null {
    if (document.pendingCount === 0) {
      return null;
    }

    return document.pendingCount === 1
      ? this.t('ingest.pendingOne')
      : this.t('ingest.pendingCount', { count: document.pendingCount });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    /**
     * Re-entry is guarded here as well as by disabling the button, because the button is not the
     * only way in — a keyboard activation on the hidden input, or a second `change` from a
     * picker that was already open, reaches this directly. Two imports of the same bytes race
     * each other on the content hash and one of them loses.
     */
    if (!file || this.uploading()) {
      return;
    }

    /* Cleared now rather than on completion, so choosing the same file again later still fires a
       `change` event. Left set, re-picking it would silently do nothing. */
    input.value = '';

    this.uploadingName.set(file.name);
    this.upload.set({ phase: 'sending', percent: null });

    this.service.upload(file).subscribe({
      next: (progress) => {
        if (progress.phase !== 'done') {
          this.upload.set(progress);

          return;
        }

        const result = progress.result;
        this.upload.set(null);
        this.uploadingName.set('');

        if (result.duplicate) {
          this.messages.add({
            severity: 'info',
            summary: this.t('ingest.uploadDuplicate'),
            detail: this.t('ingest.uploadDuplicateDetail'),
            life: 6000,
          });

          return;
        }

        if (result.status === 'unsupported') {
          this.messages.add({
            severity: 'warn',
            summary: this.t('ingest.uploadUnsupported'),
            detail: this.t('ingest.uploadUnsupportedDetail'),
            life: 8000,
          });

          return;
        }

        this.messages.add({
          severity: 'success',
          summary: this.t('ingest.uploadDone'),
          detail: this.t('ingest.uploadDoneDetail', { count: result.transactionCount }),
          life: 6000,
        });
      },
      error: () => {
        this.upload.set(null);
        this.uploadingName.set('');
      },
    });
  }
}
