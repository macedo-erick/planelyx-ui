import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { IngestResult, UploadProgress } from '../../shared/models/ingest';
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

  it('asks for reprocessing explicitly', () => {
    service.upload(new File(['x'], 'fatura.ofx'), true).subscribe();

    http.expectOne(`${environment.ocrUrl}/documents?force=true`);
  });

  describe('upload progress', () => {
    const UPLOADED: IngestResult = {
      documentId: DOCUMENT_ID,
      status: 'processed',
      duplicate: false,
      transactionCount: 3,
      warnings: [],
    };

    function uploadAndCollect(): UploadProgress[] {
      const seen: UploadProgress[] = [];
      service.upload(new File(['x'], 'fatura.pdf')).subscribe((progress) => seen.push(progress));

      return seen;
    }

    it('reports how much of the file has gone up', () => {
      const seen = uploadAndCollect();

      http
        .expectOne(`${environment.ocrUrl}/documents`)
        .event({ type: HttpEventType.UploadProgress, loaded: 40, total: 200 });

      expect(seen).toEqual([{ phase: 'sending', percent: 20 }]);
    });

    it('switches to reading once the last byte is sent', () => {
      const seen = uploadAndCollect();

      http
        .expectOne(`${environment.ocrUrl}/documents`)
        .event({ type: HttpEventType.UploadProgress, loaded: 200, total: 200 });

      expect(seen).toEqual([{ phase: 'reading' }]);
    });

    it('reports an unmeasurable upload as sending, without inventing a percentage', () => {
      const seen = uploadAndCollect();

      http
        .expectOne(`${environment.ocrUrl}/documents`)
        .event({ type: HttpEventType.UploadProgress, loaded: 40 });

      expect(seen).toEqual([{ phase: 'sending', percent: null }]);
    });

    it('ends with the result the pipeline returned', () => {
      const seen = uploadAndCollect();

      http.expectOne(`${environment.ocrUrl}/documents`).flush(UPLOADED);

      expect(seen).toEqual([{ phase: 'done', result: UPLOADED }]);
    });
  });

  it('rolls an import back through its own endpoint', () => {
    service.rollback(DOCUMENT_ID).subscribe();

    const request = http.expectOne(`${environment.ocrUrl}/documents/${DOCUMENT_ID}/rollback`);

    expect(request.request.method).toBe('POST');
  });

  it('deletes a whole import through the document endpoint', () => {
    service.delete(DOCUMENT_ID).subscribe();

    const request = http.expectOne(`${environment.ocrUrl}/documents/${DOCUMENT_ID}`);

    expect(request.request.method).toBe('DELETE');
  });
});
