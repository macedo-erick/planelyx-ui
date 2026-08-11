import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { provideTestingTransloco } from '../../../testing/transloco';
import { Uuid } from '../../shared/models/common';
import { DocumentDetail, StagedTransaction } from '../../shared/models/ingest';
import { DocumentReviewPage } from './document-review-page';

const DOCUMENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '33333333-3333-3333-3333-333333333333';
const CARD_ID = '44444444-4444-4444-4444-444444444444';
const ACCOUNT_ID = '55555555-5555-5555-5555-555555555555';

interface ReviewInternals {
  target: {
    set(value: { kind: 'card' | 'account'; id: Uuid } | null): void;
  };
  selectedIds: {
    (): ReadonlySet<Uuid>;
    set(value: ReadonlySet<Uuid>): void;
  };
  canDelete(): boolean;
  canRollback(): boolean;
  allSelected(): boolean;
  toggleAll(checked: boolean): void;
  clearSelection(): void;
  lines(): readonly StagedTransaction[];
  selectableLines(): readonly StagedTransaction[];
  blockedReason(line: StagedTransaction): string | null;
  setCategory(id: Uuid, categoryId: Uuid | null): void;
  categoryByLine(): Record<Uuid, Uuid | null>;
  confirmSelection(): void;
}

const line = (overrides: Partial<StagedTransaction> = {}): StagedTransaction => ({
  id: 'line-1',
  documentId: DOCUMENT_ID,
  documentCardId: null,
  purchaseDate: '2026-07-28',
  postingDate: '2026-08-03',
  rawDescription: 'PAGSEG *PADARIA CENTR RJ',
  normalizedDescription: 'Padaria Central',
  amount: { amountMinor: 1234, currency: 'BRL' },
  kind: 'purchase',
  isCredit: false,
  installment: null,
  foreignExchange: null,
  cardLastFourDigits: null,
  fieldConfidence: { amount: 1, description: 1 },
  needsAttention: false,
  suggestedCategoryId: null,
  suggestionSource: null,
  duplicateOf: null,
  status: 'pending',
  ...overrides,
});

const detail = (transactions: StagedTransaction[], filedCount = 0): DocumentDetail => ({
  document: {
    id: DOCUMENT_ID,
    originalFilename: 'fatura.ofx',
    type: 'ofx',
    status: 'processed',
    issuerId: null,
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    declaredTotal: { amountMinor: 1234, currency: 'BRL' },
    parserId: 'ofx',
    parserVersion: '1.0.0',
    pendingCount: transactions.length,
    filedCount,
    createdAt: '2026-08-03T00:00:00Z',
  },
  cards: [],
  transactions,
  validation: null,
});

describe('DocumentReviewPage', () => {
  let fixture: ComponentFixture<DocumentReviewPage>;
  let page: ReviewInternals;
  let http: HttpTestingController;

  async function render(transactions: StagedTransaction[], filedCount = 0): Promise<void> {
    fixture = TestBed.createComponent(DocumentReviewPage);
    fixture.componentRef.setInput('id', DOCUMENT_ID);
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);
    http
      .match((req) => req.url === `${environment.ocrUrl}/documents/${DOCUMENT_ID}`)
      .forEach((req) => req.flush(detail(transactions, filedCount)));
    http.match(() => true).forEach((req) => req.flush([]));

    await fixture.whenStable();
    fixture.detectChanges();

    page = fixture.componentInstance as unknown as ReviewInternals;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [provideTestingTransloco()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        providePrimeNG({}),
        MessageService,
      ],
    });
  });

  it('marks a line the parser was unsure about', async () => {
    await render([line({ id: 'shaky', needsAttention: true, fieldConfidence: { amount: 0.4 } })]);

    expect(fixture.nativeElement.textContent).toContain('Check');
  });

  it('flags a line that looks like one already seen', async () => {
    await render([line({ id: 'dupe', duplicateOf: 'some-other-line' })]);

    expect(fixture.nativeElement.textContent).toContain('Possible duplicate');
  });

  it('refuses to file an invoice payment as an expense', async () => {
    await render([line({ id: 'payment', kind: 'payment' })]);

    expect(page.blockedReason(page.lines()[0])).toBe('payment');
    expect(page.selectableLines()).toHaveLength(0);
  });

  it('blocks money coming back on a card, but not on an account', async () => {
    await render([line({ id: 'refund', kind: 'refund', isCredit: true })]);

    page.target.set({ kind: 'card', id: CARD_ID });
    fixture.detectChanges();
    expect(page.blockedReason(page.lines()[0])).toBe('creditOnCard');

    page.target.set({ kind: 'account', id: ACCOUNT_ID });
    fixture.detectChanges();
    expect(page.blockedReason(page.lines()[0])).toBeNull();
  });

  it('starts from the suggested category', async () => {
    await render([
      line({ id: 'suggested', suggestedCategoryId: CATEGORY_ID, suggestionSource: 'rule' }),
    ]);

    expect(page.categoryByLine()['suggested']).toBe(CATEGORY_ID);
  });

  it('selects every reviewable line and skips the ones that are blocked', async () => {
    await render([line({ id: 'buyable' }), line({ id: 'settles', kind: 'payment' })]);

    page.toggleAll(true);

    expect([...page.selectedIds()]).toEqual(['buyable']);
    expect(page.allSelected()).toBe(true);
  });

  it('clears the selection without touching the lines', async () => {
    await render([line({ id: 'buyable' })]);

    page.toggleAll(true);
    page.clearSelection();

    expect(page.selectedIds().size).toBe(0);
    expect(page.lines()).toHaveLength(1);
  });

  it('offers deletion only while nothing has been filed', async () => {
    await render([line({ id: 'line-1' })]);

    expect(page.canDelete()).toBe(true);
    expect(page.canRollback()).toBe(false);
  });

  it('offers rollback instead of deletion once a line has been filed', async () => {
    await render([line({ id: 'line-1' })], 1);

    expect(page.canDelete()).toBe(false);
    expect(page.canRollback()).toBe(true);
  });

  it('sends the reviewer’s assignment when confirming', async () => {
    await render([line({ id: 'line-1' })]);

    page.target.set({ kind: 'card', id: CARD_ID });
    page.setCategory('line-1', CATEGORY_ID);
    page.selectedIds.set(new Set(['line-1']));
    fixture.detectChanges();

    page.confirmSelection();

    const request = http.expectOne(`${environment.ocrUrl}/documents/${DOCUMENT_ID}/confirm`);

    expect(request.request.body).toEqual({
      lines: [
        {
          id: 'line-1',
          categoryId: CATEGORY_ID,
          creditCardId: CARD_ID,
          bankAccountId: null,
        },
      ],
    });
  });
});
