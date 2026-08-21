import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';

import { normalizeApiError } from '../../core/http/api-error';
import { injectTranslate } from '../../core/i18n/translate';
import {
  IngestDocument,
  IngestDocumentStatus,
  IngestDocumentType,
  UploadProgress,
} from '../../shared/models/ingest';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { dateTime } from '../../shared/util/date-format';
import { FeatureFlagService } from './feature-flag.service';
import { IngestService } from './ingest.service';

/** The body `planelyx-ocr` returns when a switched-off document type is uploaded. */
interface DisabledTypeError {
  readonly error?: string;
  readonly documentType?: IngestDocumentType;
}

/** The import queue: what has been ingested, and what still needs a decision. */
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
  protected readonly flags = inject(FeatureFlagService);
  private readonly messages = inject(MessageService);
  private readonly dom = inject(DOCUMENT);
  protected readonly t = injectTranslate();

  protected readonly upload = signal<UploadProgress | null>(null);
  protected readonly uploadingName = signal('');
  protected readonly downloadingTemplate = signal(false);

  protected readonly uploading = computed(() => this.upload() !== null);
  protected readonly documents = computed(() => this.service.sorted());

  /** Driven by the flags rather than a fixed list, so a switched-off format stops being offered. */
  protected readonly accept = computed(() => this.flags.accept());
  protected readonly canUpload = computed(() => this.flags.uploadableTypes().length > 0);
  protected readonly csvEnabled = computed(() => this.flags.isEnabled('parse.csv'));

  protected readonly readableFormats = computed(() => this.typeList(this.flags.readableTypes()));
  protected readonly storedOnlyFormats = computed(() =>
    this.typeList(this.flags.storedOnlyTypes()),
  );

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

  protected typeLabel(type: IngestDocumentType): string {
    return this.t(`ingest.type.${type}`);
  }

  private typeList(types: readonly IngestDocumentType[]): string {
    return types.map((type) => this.typeLabel(type)).join(', ');
  }

  /** `unsupported` is a warning rather than an error. */
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

  /** Saves the empty template through the token-bearing client rather than a bare link. */
  protected onDownloadTemplate(): void {
    if (this.downloadingTemplate()) {
      return;
    }

    this.downloadingTemplate.set(true);

    this.service.downloadTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate.set(false);

        const url = URL.createObjectURL(blob);
        const link = this.dom.createElement('a');

        link.href = url;
        link.download = this.service.templateFilename();
        link.click();

        URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingTemplate.set(false);
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.uploading()) {
      return;
    }

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

        if (result.warnings.length > 0) {
          this.messages.add({
            severity: 'warn',
            summary: this.t('ingest.uploadWarnings', { count: result.warnings.length }),
            detail: result.warnings.join(' '),
            life: 12000,
          });
        }
      },
      error: (error: unknown) => {
        this.upload.set(null);
        this.uploadingName.set('');
        this.reportUploadFailure(error);
      },
    });
  }

  /** The upload silences the global toast, so every failure has to be named here. */
  private reportUploadFailure(error: unknown): void {
    const body =
      error instanceof HttpErrorResponse ? (error.error as DisabledTypeError | null) : null;
    const disabledType = body?.error === 'document_type_disabled' ? body.documentType : undefined;

    if (disabledType !== undefined) {
      this.flags.reload();

      this.messages.add({
        severity: 'warn',
        summary: this.t('ingest.typeDisabled'),
        detail: this.t('ingest.typeDisabledDetail', { type: this.typeLabel(disabledType) }),
        life: 10000,
      });

      return;
    }

    const normalized = normalizeApiError(error);

    this.messages.add({
      severity: 'error',
      summary: this.t(normalized.titleKey),
      detail: normalized.detailKey ? this.t(normalized.detailKey) : normalized.detail,
      life: 6000,
    });
  }
}
