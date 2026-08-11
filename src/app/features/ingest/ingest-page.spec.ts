import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { provideTestingTransloco } from '../../../testing/transloco';
import { IngestResult } from '../../shared/models/ingest';
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
