import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { FeatureFlag, FeatureFlagKey } from '../../shared/models/ingest';
import { FeatureFlagService } from './feature-flag.service';

const FLAGS_URL = `${environment.ocrUrl}/flags`;

function flag(key: FeatureFlagKey, enabled: boolean, effective = enabled): FeatureFlag {
  return {
    key,
    enabled,
    effective,
    updatedAt: '2026-08-20T12:00:00Z',
    updatedBy: null,
  };
}

const ALL_ON: FeatureFlag[] = [
  flag('parse.pdf_statement', true),
  flag('parse.csv', true),
  flag('parse.ofx', true),
  flag('parse.receipt_image', true),
  flag('llm.escalation', true),
];

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FeatureFlagService);
    http = TestBed.inject(HttpTestingController);
  });

  /** Drives the effect that issues the resource's request, then lets the answer settle. */
  async function respond(
    body: FeatureFlag[] | string,
    options?: { status: number; statusText: string },
  ): Promise<void> {
    TestBed.tick();

    http.expectOne(FLAGS_URL).flush(body, options);

    await Promise.resolve();
    TestBed.tick();
  }

  async function load(flags: FeatureFlag[]): Promise<void> {
    await respond(flags);
  }

  it('treats everything as on until the flags arrive, so a slow service cannot block an import', () => {
    expect(service.isEnabled('parse.csv')).toBe(true);
    expect(service.uploadableTypes()).toContain('pdf_statement');
  });

  it('keeps importing when the flag service is unreachable', async () => {
    await respond('down', { status: 503, statusText: 'Unavailable' });

    expect(service.hasError()).toBe(true);
    expect(service.isEnabled('parse.pdf_statement')).toBe(true);
  });

  it('drops a switched-off type from what the file picker offers', async () => {
    await load([flag('parse.pdf_statement', false), ...ALL_ON.slice(1)]);

    expect(service.uploadableTypes()).not.toContain('pdf_statement');
    expect(service.accept()).not.toContain('.pdf');
    expect(service.accept()).toContain('.csv');
  });

  it('separates the formats a parser reads from the ones only kept on disk', async () => {
    await load(ALL_ON);

    expect(service.readableTypes()).toEqual(['pdf_statement', 'csv']);
    expect(service.storedOnlyTypes()).toEqual(['ofx', 'receipt_image']);
  });

  it('follows `effective`, so escalation without an API key never reads as on', async () => {
    await load([...ALL_ON.slice(0, 4), flag('llm.escalation', true, false)]);

    expect(service.isEnabled('llm.escalation')).toBe(false);
  });

  it('lists the flags in the server order rather than the order they arrived in', async () => {
    await load([...ALL_ON].reverse());

    expect(service.ordered().map((state) => state.key)).toEqual([
      'parse.pdf_statement',
      'parse.csv',
      'parse.ofx',
      'parse.receipt_image',
      'llm.escalation',
    ]);
  });

  it('patches one key rather than replacing the whole set', async () => {
    await load(ALL_ON);

    service.setEnabled('parse.pdf_statement', false).subscribe();

    const request = http.expectOne(`${FLAGS_URL}/parse.pdf_statement`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ enabled: false });
  });
});
