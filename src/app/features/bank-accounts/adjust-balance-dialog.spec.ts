import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FieldTree } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { BankAccount } from '../../shared/models/bank-account';
import { AdjustBalanceDialog } from './adjust-balance-dialog';
import { provideTestingTransloco } from '../../../testing/transloco';

interface AdjustBalanceInternals {
  f: FieldTree<{ targetBalance: number | null; transactionDate: string | null }>;
  delta(): number;
  deltaLabel(): string;
  unchanged(): boolean;
  onSubmit(): void;
}

const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

const ACCOUNT: BankAccount = {
  id: ACCOUNT_ID,
  name: 'Everyday',
  bankName: 'Nubank',
  accountType: 'CHECKING',
  initialBalance: 100,
  currency: 'BRL',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('AdjustBalanceDialog', () => {
  let fixture: ComponentFixture<AdjustBalanceDialog>;
  let http: HttpTestingController;
  let dialog: AdjustBalanceInternals;

  async function open(currentBalance: number): Promise<void> {
    fixture = TestBed.createComponent(AdjustBalanceDialog);
    fixture.componentRef.setInput('visible', false);
    fixture.componentRef.setInput('account', ACCOUNT);
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);

    http.match(`${environment.apiUrl}/bank-accounts`).forEach((req) => req.flush([ACCOUNT]));
    http.match(`${environment.apiUrl}/bank-accounts/balances`).forEach((req) =>
      req.flush([
        {
          bankAccountId: ACCOUNT_ID,
          currency: 'BRL',
          balance: currentBalance,
          asOf: '2026-08-31',
        },
      ]),
    );
    await fixture.whenStable();

    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    dialog = fixture.componentInstance as unknown as AdjustBalanceInternals;
  }

  function acceptConfirmation(): void {
    TestBed.inject(ConfirmationService).requireConfirmation$.subscribe((options) =>
      options?.accept?.(),
    );
  }

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
  });

  it('opens on the balance it is replacing, not on zero', async () => {
    await open(250);

    expect(dialog.f.targetBalance().value()).toBe(250);
    expect(dialog.unchanged()).toBe(true);
  });

  it('measures the difference against the live balance, not the initial one', async () => {
    await open(250);

    dialog.f.targetBalance().value.set(300);
    fixture.detectChanges();

    expect(dialog.delta()).toBe(50);
    expect(dialog.deltaLabel()).toMatch(/^\+/);
  });

  it('reports a shortfall as a negative difference', async () => {
    await open(250);

    dialog.f.targetBalance().value.set(180);
    fixture.detectChanges();

    expect(dialog.delta()).toBe(-70);
    expect(dialog.deltaLabel()).toMatch(/^−/);
  });

  it('posts the target balance rather than the difference', async () => {
    await open(250);
    acceptConfirmation();

    dialog.f.targetBalance().value.set(300);
    fixture.detectChanges();
    dialog.onSubmit();

    const req = http.expectOne(`${environment.apiUrl}/bank-accounts/${ACCOUNT_ID}/adjust-balance`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ targetBalance: 300 });
  });

  it('posts nothing when the balance already matches', async () => {
    await open(250);
    acceptConfirmation();

    dialog.onSubmit();

    http.expectNone(`${environment.apiUrl}/bank-accounts/${ACCOUNT_ID}/adjust-balance`);
  });
});
