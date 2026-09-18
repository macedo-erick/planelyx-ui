import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideTestingTransloco } from '../../../testing/transloco';
import { Transaction } from '../models/transaction';
import { amountsHidden } from '../util/amount-visibility';
import { currentLocale } from '../util/locale';
import { PlanelyxTransactionRow } from './transaction-row';

describe('PlanelyxTransactionRow', () => {
  it('re-renders the amount when amounts are hidden', async () => {
    TestBed.configureTestingModule({ imports: [provideTestingTransloco()] });
    currentLocale.set('pt-BR');
    amountsHidden.set(false);

    const fixture: ComponentFixture<PlanelyxTransactionRow> =
      TestBed.createComponent(PlanelyxTransactionRow);
    fixture.componentRef.setInput('transaction', {
      id: '1',
      description: 'Groceries',
      amount: 1234.56,
      kind: 'ACCOUNT_DEBIT',
      purchaseDate: '2026-08-03',
    } as Transaction);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('1.234,56');

    amountsHidden.set(true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('••••');
    expect(fixture.nativeElement.textContent).not.toContain('1.234,56');

    amountsHidden.set(false);
  });

  /**
   * Sign and colour answer different questions: which way the money went, and whether the owner
   * ended up richer or poorer. A transfer moves an account without being either.
   */
  it.each([
    { kind: 'ACCOUNT_CREDIT', sign: '+', colour: 'text-green-600' },
    { kind: 'ACCOUNT_DEBIT', sign: '−', colour: 'text-red-500' },
    { kind: 'CARD_CHARGE', sign: '−', colour: 'text-red-500' },
    { kind: 'INVOICE_PAYMENT', sign: '−', colour: 'text-[var(--p-text-color)]' },
    { kind: 'INVESTMENT_CONTRIBUTION', sign: '−', colour: 'text-[var(--p-text-color)]' },
    { kind: 'INVESTMENT_REDEMPTION', sign: '+', colour: 'text-[var(--p-text-color)]' },
    { kind: 'INVESTMENT_YIELD', sign: '+', colour: 'text-green-600' },
    { kind: 'INVESTMENT_LOSS', sign: '−', colour: 'text-red-500' },
  ])('renders $kind as $sign in $colour', async ({ kind, sign, colour }) => {
    TestBed.configureTestingModule({ imports: [provideTestingTransloco()] });
    currentLocale.set('pt-BR');
    amountsHidden.set(false);

    const fixture: ComponentFixture<PlanelyxTransactionRow> =
      TestBed.createComponent(PlanelyxTransactionRow);
    fixture.componentRef.setInput('transaction', {
      id: '1',
      description: 'Movement',
      amount: 100,
      kind,
      purchaseDate: '2026-08-03',
    } as Transaction);
    await fixture.whenStable();

    const amount: HTMLElement = fixture.nativeElement.querySelector('.tabular-nums');

    expect(amount.textContent?.trim().startsWith(sign)).toBe(true);
    expect(amount.className).toContain(colour);
  });
});
