import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { injectTranslate } from '../../core/i18n/translate';
import { IngestDocument, IngestDocumentStatus } from '../../shared/models/ingest';
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
  imports: [Button, Tag, RouterLink, PlanelyxCard, PlanelyxPageHeader, PlanelyxEmptyState],
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

  protected readonly uploading = signal(false);
  protected readonly documents = computed(() => this.service.sorted());

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

    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.service.upload(file).subscribe({
      next: (result) => {
        this.uploading.set(false);
        input.value = '';

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
        this.uploading.set(false);
        input.value = '';
      },
    });
  }
}
