import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { TransactionFormDialog } from './transaction-form-dialog';

interface TransactionFormDialogInternals {
  f: any;
  previewSummary(): string;
  onSubmit(): void;
}

/**
 * The form posts to one of two different endpoints depending on the "Repeats" choice,
 * and each has server-side rules that return 400 when violated. These tests pin the
 * routing and payload shaping so a regression shows up here rather than as an API error.
 */
describe('TransactionFormDialog', () => {
  let fixture: ComponentFixture<TransactionFormDialog>;
  let http: HttpTestingController;
  /** Protected members are reached deliberately; this dialog has no public test surface. */
  let form: TransactionFormDialogInternals;

  const ACCOUNT = '11111111-1111-1111-1111-111111111111';
  const CARD = '22222222-2222-2222-2222-222222222222';
  const CATEGORY = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        providePrimeNG({}),
        MessageService,
        ConfirmationService,
      ],
    });

    fixture = TestBed.createComponent(TransactionFormDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('transaction', null);
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);

    http.match(() => true).forEach((req) => req.flush([]));

    form = fixture.componentInstance as unknown as TransactionFormDialogInternals;
  });

  function fill(overrides: Record<string, unknown> = {}): void {
    const f = form.f;
    f.categoryId().value.set(CATEGORY);
    f.amount().value.set(120);
    f.transactionDate().value.set('2026-08-03');
    f.description().value.set('PS5');
    for (const [key, value] of Object.entries(overrides)) {
      f[key]().value.set(value);
    }
    fixture.detectChanges();
  }

  it('posts a plain transaction when it does not repeat', () => {
    fill({ kind: 'ACCOUNT_DEBIT', bankAccountId: ACCOUNT, repeats: 'NONE' });
    form.onSubmit();

    const req = http.expectOne(`${environment.apiUrl}/transactions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      kind: 'ACCOUNT_DEBIT',
      bankAccountId: ACCOUNT,
      creditCardId: null,
      amount: 120,
      description: 'PS5',
    });

    expect(req.request.body).not.toHaveProperty('recurrenceType');
  });

  it('posts a template when it repeats, mapping amount to totalAmount', () => {
    fill({ kind: 'CARD_CHARGE', creditCardId: CARD, repeats: 'INSTALLMENT', totalOccurrences: 12 });
    form.onSubmit();

    const req = http.expectOne(`${environment.apiUrl}/transaction-templates`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      kind: 'CARD_CHARGE',
      creditCardId: CARD,
      bankAccountId: null,
      recurrenceType: 'INSTALLMENT',
      totalAmount: 120,
      totalOccurrences: 12,
      startDate: '2026-08-03',
    });
  });

  it('sends a null occurrence count for an open-ended rule', () => {
    fill({ kind: 'ACCOUNT_DEBIT', bankAccountId: ACCOUNT, repeats: 'FIXED_INDEFINITE' });
    form.onSubmit();

    const req = http.expectOne(`${environment.apiUrl}/transaction-templates`);

    expect(req.request.body.totalOccurrences).toBeNull();
  });

  it('forces the kind to a card charge when installments are chosen', () => {
    fill({ kind: 'ACCOUNT_DEBIT', bankAccountId: ACCOUNT });
    form.f.repeats().value.set('INSTALLMENT');
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();

    expect(form.f.kind().value()).toBe('CARD_CHARGE');
  });

  it('blocks submission when installments are fewer than two', () => {
    fill({ kind: 'CARD_CHARGE', creditCardId: CARD, repeats: 'INSTALLMENT', totalOccurrences: 1 });
    form.onSubmit();

    http.expectNone(`${environment.apiUrl}/transaction-templates`);
    expect(form.f.totalOccurrences().invalid()).toBe(true);
  });

  it('previews the per-installment amount as "count × value"', () => {
    fill({ kind: 'CARD_CHARGE', creditCardId: CARD, repeats: 'INSTALLMENT', totalOccurrences: 12 });
    form.f.amount().value.set(10000);
    fixture.detectChanges();

    expect(form.previewSummary()).toMatch(/^12 × /);
    expect(form.previewSummary()).toContain('833');
    expect(form.previewSummary()).not.toContain('then');
  });

  it('shows nothing until the installment count and amount are both usable', () => {
    fill({ kind: 'CARD_CHARGE', creditCardId: CARD, repeats: 'INSTALLMENT', totalOccurrences: 1 });
    fixture.detectChanges();
    expect(form.previewSummary()).toBe('');

    form.f.totalOccurrences().value.set(4);
    form.f.amount().value.set(0);
    fixture.detectChanges();
    expect(form.previewSummary()).toBe('');
  });
});
