import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideTestingTransloco } from '../../../testing/transloco';
import { Transaction } from '../models/transaction';
import { amountsHidden } from '../util/amount-visibility';
import { currentLocale } from '../util/locale';
import { PlanelyxTransactionRow } from './transaction-row';

/**
 * The row is where the amount mask has to prove itself: `formatMoney` reads `amountsHidden`
 * from inside a `computed`, and nothing subscribes to anything. If that read were ever hoisted
 * out — cached in a pipe, or resolved once at construction — the toggle would go quiet and the
 * figure would stay on screen. Deliberately no `detectChanges()` here: the assertion is that
 * flipping the signal is enough on its own to schedule the re-render.
 */
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
});
