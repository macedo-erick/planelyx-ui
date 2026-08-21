import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { provideTestingTransloco } from '../../../testing/transloco';
import { FeatureFlag, FeatureFlagKey, IngestResult } from '../../shared/models/ingest';
import { IngestPage } from './ingest-page';

interface IngestPageInternals {
  onFileSelected(event: Event): void;
}

const UPLOADED: IngestResult = {
  documentId: '11111111-1111-1111-1111-111111111111',
  status: 'processed',
  duplicate: false,
  transactionCount: 4,
  warnings: [],
};

/** A `change` event as the hidden file input would raise one. */
function fileEvent(name = 'fatura.pdf'): Event {
  const input = {
    files: [new File(['%PDF-1.4'], name, { type: 'application/pdf' })],
    value: `C:\\fakepath\\${name}`,
  } as unknown as HTMLInputElement;

  return { target: input } as unknown as Event;
}

describe('IngestPage upload feedback', () => {
  let fixture: ComponentFixture<IngestPage>;
  let http: HttpTestingController;
  let page: IngestPageInternals;

  const text = (): string => fixture.nativeElement.textContent ?? '';

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [provideTestingTransloco()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        providePrimeNG({}),
        MessageService,
      ],
    });

    fixture = TestBed.createComponent(IngestPage);
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);
    http.match(() => true).forEach((request) => request.flush([]));

    await fixture.whenStable();
    fixture.detectChanges();

    page = fixture.componentInstance as unknown as IngestPageInternals;
  });

  function startUpload(name?: string): void {
    page.onFileSelected(fileEvent(name));
    fixture.detectChanges();
  }

  it('names the file it is importing, so the wait is attached to something', () => {
    startUpload('nubank-agosto.pdf');

    expect(text()).toContain('nubank-agosto.pdf');
    http.expectOne(`${environment.ocrUrl}/documents`);
  });

  it('says the file is still going up while it is', () => {
    startUpload();

    http
      .expectOne(`${environment.ocrUrl}/documents`)
      .event({ type: HttpEventType.UploadProgress, loaded: 40, total: 200 });
    fixture.detectChanges();

    expect(text()).toContain('Sending the file');
  });

  it('says the statement is being read once the bytes are all sent', () => {
    startUpload();

    http
      .expectOne(`${environment.ocrUrl}/documents`)
      .event({ type: HttpEventType.UploadProgress, loaded: 200, total: 200 });
    fixture.detectChanges();

    expect(text()).toContain('Reading the statement');
  });

  it('refuses a second file while one is still importing', () => {
    startUpload();
    http.expectOne(`${environment.ocrUrl}/documents`);

    startUpload('outra.pdf');

    http.expectNone(`${environment.ocrUrl}/documents`);
  });

  it('clears the progress once the import lands', () => {
    startUpload();

    http.expectOne(`${environment.ocrUrl}/documents`).flush(UPLOADED);
    fixture.detectChanges();

    expect(text()).not.toContain('Reading the statement');
    expect(text()).not.toContain('Sending the file');
  });

  it('clears the progress when the import fails, rather than hanging on it', () => {
    startUpload();

    http
      .expectOne(`${environment.ocrUrl}/documents`)
      .flush('nope', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).not.toContain('Sending the file');
  });

  it('does not offer the empty state while an import is in flight', () => {
    expect(text()).toContain('Nothing imported yet');

    startUpload();

    expect(text()).not.toContain('Nothing imported yet');
  });
});

function flag(key: FeatureFlagKey, enabled: boolean): FeatureFlag {
  return { key, enabled, effective: enabled, updatedAt: '2026-08-20T12:00:00Z', updatedBy: null };
}

const ALL_ON: FeatureFlag[] = [
  flag('parse.pdf_statement', true),
  flag('parse.csv', true),
  flag('parse.ofx', true),
  flag('parse.receipt_image', true),
  flag('llm.escalation', true),
];

describe('IngestPage feature flags', () => {
  let fixture: ComponentFixture<IngestPage>;
  let http: HttpTestingController;
  let messages: MessageService;

  const text = (): string => fixture.nativeElement.textContent ?? '';

  async function render(flags: FeatureFlag[]): Promise<void> {
    TestBed.configureTestingModule({
      imports: [provideTestingTransloco()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        providePrimeNG({}),
        MessageService,
      ],
    });

    fixture = TestBed.createComponent(IngestPage);
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);
    messages = TestBed.inject(MessageService);

    for (const request of http.match(() => true)) {
      request.flush(request.request.url.endsWith('/flags') ? flags : []);
    }

    await fixture.whenStable();
    fixture.detectChanges();
  }

  const acceptAttribute = (): string =>
    (fixture.nativeElement as HTMLElement)
      .querySelector('input[type=file]')
      ?.getAttribute('accept') ?? '';

  it('names the formats a reader actually handles', async () => {
    await render(ALL_ON);

    expect(text()).toContain('PDF statement, CSV');
  });

  it('is honest that the other formats are only kept on disk', async () => {
    await render(ALL_ON);

    expect(text()).toContain('OFX, Receipt photo');
  });

  it('stops offering a format that has been switched off', async () => {
    await render([flag('parse.pdf_statement', false), ...ALL_ON.slice(1)]);

    expect(acceptAttribute()).not.toContain('.pdf');
    expect(acceptAttribute()).toContain('.csv');
  });

  it('hides the template download when CSV imports are off', async () => {
    await render([...ALL_ON.slice(0, 1), flag('parse.csv', false), ...ALL_ON.slice(2)]);

    expect(text()).not.toContain('CSV template');
  });

  it('says so plainly when every format is off, rather than failing at upload', async () => {
    await render([
      flag('parse.pdf_statement', false),
      flag('parse.csv', false),
      flag('parse.ofx', false),
      flag('parse.receipt_image', false),
      flag('llm.escalation', false),
    ]);

    expect(text()).toContain('Importing is switched off for every format');
    expect(acceptAttribute()).toBe('');
  });

  it('names the switched-off format when the server refuses the upload', async () => {
    await render(ALL_ON);

    const added = vi.spyOn(messages, 'add');

    (fixture.componentInstance as unknown as { onFileSelected(event: Event): void }).onFileSelected(
      fileEvent(),
    );
    fixture.detectChanges();

    http
      .expectOne(`${environment.ocrUrl}/documents`)
      .flush(
        { error: 'document_type_disabled', documentType: 'pdf_statement' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    fixture.detectChanges();

    expect(added).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        detail: expect.stringContaining('PDF statement'),
      }),
    );
  });

  it('downloads the template through the token-bearing client', async () => {
    await render(ALL_ON);

    (fixture.componentInstance as unknown as { onDownloadTemplate(): void }).onDownloadTemplate();

    const request = http.expectOne(`${environment.ocrUrl}/templates/transactions.csv`);

    expect(request.request.responseType).toBe('blob');
  });
});
