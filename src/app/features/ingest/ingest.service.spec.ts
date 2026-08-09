import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { IngestService } from './ingest.service';

const DOCUMENT_ID = '11111111-1111-1111-1111-111111111111';
const LINE_ID = '22222222-2222-2222-2222-222222222222';
const CATEGORY_ID = '33333333-3333-3333-3333-333333333333';
const CARD_ID = '44444444-4444-4444-4444-444444444444';

describe('IngestService', () => {
  let service: IngestService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(IngestService);
    http = TestBed.inject(HttpTestingController);
  });

  /**
   * The whole reason `ocrUrl` exists. Hitting `apiUrl` would reach the wrong service, and — more
   * quietly — the bearer-token interceptor is scoped per host, so a request to an unlisted URL
   * leaves without a token and comes back 401 looking like a broken login.
   */
  it('addresses planelyx-ocr, not the API', () => {
    service
      .confirm(DOCUMENT_ID, {
        lines: [{ id: LINE_ID, categoryId: CATEGORY_ID, creditCardId: CARD_ID }],
      })
      .subscribe();

    const request = http.expectOne(`${environment.ocrUrl}/documents/${DOCUMENT_ID}/confirm`);

    expect(request.request.url.startsWith(environment.ocrUrl)).toBe(true);
    expect(request.request.url.startsWith(environment.apiUrl)).toBe(false);
  });

  /**
   * The assignment has to survive the trip: `planelyx-ocr` holds no catalogue of categories or
   * cards, so whatever the reviewer picked is the only thing that can satisfy the API's
   * not-null category and its exactly-one-of card/account rule.
   */
  it('sends the per-line assignment the reviewer made', () => {
    service
      .confirm(DOCUMENT_ID, {
        lines: [
          { id: LINE_ID, categoryId: CATEGORY_ID, creditCardId: CARD_ID, bankAccountId: null },
        ],
      })
      .subscribe();

    const request = http.expectOne(`${environment.ocrUrl}/documents/${DOCUMENT_ID}/confirm`);

    expect(request.request.body).toEqual({
      lines: [{ id: LINE_ID, categoryId: CATEGORY_ID, creditCardId: CARD_ID, bankAccountId: null }],
    });
  });

  /**
   * The bytes go up untouched. The service deduplicates by hashing the file's own content, so
   * anything that re-encodes on the way changes the hash and a re-import stops being recognised
   * as one.
   */
  it('uploads the file as multipart without re-encoding it', async () => {
    const file = new File(['OFXHEADER:100'], 'fatura.ofx', { type: 'application/x-ofx' });

    service.upload(file).subscribe();

    const request = http.expectOne(`${environment.ocrUrl}/documents`);
    const body = request.request.body as FormData;
    const sent = body.get('file') as File;

    expect(body).toBeInstanceOf(FormData);
    expect(sent.name).toBe('fatura.ofx');
    expect(await sent.text()).toBe('OFXHEADER:100');
  });

  /** `force` is what reprocesses a document already seen — needed after a parser is fixed. */
  it('asks for reprocessing explicitly', () => {
    service.upload(new File(['x'], 'fatura.ofx'), true).subscribe();

    http.expectOne(`${environment.ocrUrl}/documents?force=true`);
  });

  it('rolls an import back through its own endpoint', () => {
    service.rollback(DOCUMENT_ID).subscribe();

    const request = http.expectOne(`${environment.ocrUrl}/documents/${DOCUMENT_ID}/rollback`);

    expect(request.request.method).toBe('POST');
  });

  /** The document itself, not `/staging` — that one keeps the document and drops its lines. */
  it('deletes a whole import through the document endpoint', () => {
    service.delete(DOCUMENT_ID).subscribe();

    const request = http.expectOne(`${environment.ocrUrl}/documents/${DOCUMENT_ID}`);

    expect(request.request.method).toBe('DELETE');
  });
});
