import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef, WritableSignal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { toIsoDate } from '../../shared/util/date';
import { TransactionFormDialog, TransactionFormModel } from './transaction-form-dialog';
import { provideTestingTransloco } from '../../../testing/transloco';

interface TransactionFormDialogInternals {
  f: FieldTree<TransactionFormModel>;
  previewSummary(): string;
  onSubmit(): void;
  paidVisible(): boolean;
  paid(): boolean;
  onPaidChange(paid: boolean): void;
}

describe('TransactionFormDialog', () => {
  let fixture: ComponentFixture<TransactionFormDialog>;
  let http: HttpTestingController;
  let form: TransactionFormDialogInternals;

  const ACCOUNT = '11111111-1111-1111-1111-111111111111';
  const CARD = '22222222-2222-2222-2222-222222222222';
  const CATEGORY = '33333333-3333-3333-3333-333333333333';
  const CREATED = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [provideTestingTransloco()],
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

  function fill(overrides: Partial<TransactionFormModel> = {}): void {
    const f = form.f;
    f.categoryId().value.set(CATEGORY);
    f.amount().value.set(120);
    f.transactionDate().value.set('2026-08-03');
    f.description().value.set('PS5');
    for (const [key, value] of Object.entries(overrides)) {
      const field = f[key as keyof TransactionFormModel]() as unknown as {
        value: WritableSignal<unknown>;
      };
      field.value.set(value);
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

  describe('the paid tick', () => {
    function tick(): void {
      fixture.detectChanges();
      TestBed.inject(ApplicationRef).tick();
    }

    it('is offered for a new account debit', () => {
      fill({ kind: 'ACCOUNT_DEBIT', bankAccountId: ACCOUNT, repeats: 'NONE' });

      expect(form.paidVisible()).toBe(true);
    });

    it('is hidden for a card charge and for a recurring rule', () => {
      fill({ kind: 'CARD_CHARGE', creditCardId: CARD, repeats: 'NONE' });
      expect(form.paidVisible()).toBe(false);

      fill({ kind: 'ACCOUNT_DEBIT', bankAccountId: ACCOUNT, repeats: 'FIXED_INDEFINITE' });
      expect(form.paidVisible()).toBe(false);
    });

    it('follows the date until the user sets it', () => {
      fill({ kind: 'ACCOUNT_DEBIT', bankAccountId: ACCOUNT, repeats: 'NONE' });
      tick();
      expect(form.paid()).toBe(true);

      form.f.transactionDate().value.set(isoDaysFromNow(7));
      tick();
      expect(form.paid()).toBe(false);

      form.onPaidChange(true);
      form.f.transactionDate().value.set(isoDaysFromNow(14));
      tick();
      expect(form.paid()).toBe(true);
    });

    it('rides along in the create payload', () => {
      fill({ kind: 'ACCOUNT_DEBIT', bankAccountId: ACCOUNT, repeats: 'NONE' });
      form.onPaidChange(false);
      form.onSubmit();

      const req = http.expectOne(`${environment.apiUrl}/transactions`);

      expect(req.request.body.paid).toBe(false);

      req.flush({ id: CREATED, kind: 'ACCOUNT_DEBIT', paid: false });

      http.expectNone(`${environment.apiUrl}/transactions/${CREATED}/pay`);
      http.expectNone(`${environment.apiUrl}/transactions/${CREATED}/unpay`);
    });

    it('is left out of the payload for a card charge', () => {
      fill({ kind: 'CARD_CHARGE', creditCardId: CARD, repeats: 'NONE' });
      form.onSubmit();

      const req = http.expectOne(`${environment.apiUrl}/transactions`);

      expect(req.request.body.paid).toBeUndefined();
    });
  });
});

/** Relative, so a fixed date cannot quietly fall into the past and invert what is being tested. */
function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return toIsoDate(date);
}
