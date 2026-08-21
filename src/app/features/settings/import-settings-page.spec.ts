import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { provideTestingTransloco } from '../../../testing/transloco';
import { FeatureFlag, FeatureFlagKey } from '../../shared/models/ingest';
import { ImportSettingsPage } from './import-settings-page';

interface PageInternals {
  onToggle(flag: FeatureFlag, enabled: boolean): void;
}

const FLAGS_URL = `${environment.ocrUrl}/flags`;

function flag(key: FeatureFlagKey, enabled: boolean, effective = enabled): FeatureFlag {
  return { key, enabled, effective, updatedAt: '2026-08-20T12:00:00Z', updatedBy: null };
}

const ALL_ON: FeatureFlag[] = [
  flag('parse.pdf_statement', true),
  flag('parse.csv', true),
  flag('parse.ofx', true),
  flag('parse.receipt_image', true),
  flag('llm.escalation', true),
];

describe('ImportSettingsPage', () => {
  let fixture: ComponentFixture<ImportSettingsPage>;
  let http: HttpTestingController;

  const text = (): string => fixture.nativeElement.textContent ?? '';
  const page = (): PageInternals => fixture.componentInstance as unknown as PageInternals;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [provideTestingTransloco()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        providePrimeNG({}),
        MessageService,
      ],
    });

    fixture = TestBed.createComponent(ImportSettingsPage);
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);
  });

  async function load(flags: FeatureFlag[]): Promise<void> {
    http.expectOne(FLAGS_URL).flush(flags);

    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('names every switch the server serves', async () => {
    await load(ALL_ON);

    expect(text()).toContain('PDF statements');
    expect(text()).toContain('CSV imports');
    expect(text()).toContain('Language-model fallback');
  });

  it('separates what is accepted from how hard it is read', async () => {
    await load(ALL_ON);

    expect(text()).toContain('File formats');
    expect(text()).toContain('Reading');
  });

  it('patches only the switch that moved', async () => {
    await load(ALL_ON);

    page().onToggle(flag('parse.pdf_statement', true), false);

    const request = http.expectOne(`${FLAGS_URL}/parse.pdf_statement`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ enabled: false });
  });

  it('re-reads the flags after a change, rather than trusting the local copy', async () => {
    await load(ALL_ON);

    page().onToggle(flag('parse.csv', true), false);
    http.expectOne(`${FLAGS_URL}/parse.csv`).flush(flag('parse.csv', false));
    TestBed.tick();

    http.expectOne(FLAGS_URL);
  });

  it('puts the flags back as the server has them when the change is refused', async () => {
    await load(ALL_ON);

    page().onToggle(flag('parse.csv', true), false);
    http
      .expectOne(`${FLAGS_URL}/parse.csv`)
      .flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
    TestBed.tick();

    http.expectOne(FLAGS_URL);
  });

  it('warns when escalation is on but the server has no key to use', async () => {
    await load([...ALL_ON.slice(0, 4), flag('llm.escalation', true, false)]);

    expect(text()).toContain('no API key configured');
  });

  it('says the settings are unavailable rather than showing an empty page', async () => {
    http.expectOne(FLAGS_URL).flush('down', { status: 503, statusText: 'Unavailable' });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('Settings unavailable');
  });
});
