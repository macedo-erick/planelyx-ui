import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { provideTestingTransloco } from '../../../testing/transloco';
import { Invoice } from '../../shared/models/invoice';
import { Transaction } from '../../shared/models/transaction';
import { InvoicesPage } from './invoices-page';

interface InvoicesPageInternals {
  selectedCardId: { set(value: string | null): void };
  selectedMonth: { set(value: Date): void };
  invoice(): Invoice | null;
  charges(): readonly Transaction[];
}

const CARD_ID = '22222222-2222-2222-2222-222222222222';
const TEMPLATE_ID = '33333333-3333-3333-3333-333333333333';

/**
 * Two consecutive periods on a card closing the 28th and due the 5th.
 *
 * Both close a month before they are paid, which is exactly the shape that used to break: the
 * screen keyed an invoice on the month its period ended in, so the one paid on 5 September
 * showed up under August while the dashboard listed it under September.
 */
const AUGUST_CLOSE_SEPTEMBER_DUE: Invoice = {
  id: '44444444-4444-4444-4444-444444444444',
  creditCardId: CARD_ID,
  referenceMonth: '2026-09',
  billingPeriodStart: '2026-07-29',
  billingPeriodEnd: '2026-08-28',
  dueDate: '2026-09-05',
  totalAmount: 200,
  status: 'OPEN',
  paidAt: null,
  createdAt: '2026-07-29T00:00:00Z',
};

const SEPTEMBER_CLOSE_OCTOBER_DUE: Invoice = {
  id: '55555555-5555-5555-5555-555555555555',
  creditCardId: CARD_ID,
  referenceMonth: '2026-10',
  billingPeriodStart: '2026-08-29',
  billingPeriodEnd: '2026-09-28',
  dueDate: '2026-10-05',
  totalAmount: 90,
  status: 'OPEN',
  paidAt: null,
  createdAt: '2026-08-29T00:00:00Z',
};

const charge = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx',
  kind: 'CARD_CHARGE',
  bankAccountId: null,
  creditCardId: CARD_ID,
  categoryId: '66666666-6666-6666-6666-666666666666',
  invoiceId: AUGUST_CLOSE_SEPTEMBER_DUE.id,
  templateId: null,
  installmentNumber: null,
  totalInstallments: null,
  amount: 50,
  transactionDate: '2026-08-01',
  purchaseDate: '2026-08-01',
  description: 'Charge',
  paid: false,
  createdAt: '2026-08-01T00:00:00Z',
  ...overrides,
});

describe('InvoicesPage', () => {
  let fixture: ComponentFixture<InvoicesPage>;
  /** Protected members are reached deliberately; the month keying has no public surface. */
  let page: InvoicesPageInternals;

  function showMonth(year: number, monthIndex: number): Invoice | null {
    page.selectedCardId.set(CARD_ID);
    page.selectedMonth.set(new Date(year, monthIndex, 1));
    fixture.detectChanges();
    return page.invoice();
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

    fixture = TestBed.createComponent(InvoicesPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http
      .match((req) => req.url === `${environment.apiUrl}/invoices`)
      .forEach((req) => req.flush([AUGUST_CLOSE_SEPTEMBER_DUE, SEPTEMBER_CLOSE_OCTOBER_DUE]));
    http.match(() => true).forEach((req) => req.flush([]));

    fixture.detectChanges();

    page = fixture.componentInstance as unknown as InvoicesPageInternals;
  });

  it('shows an invoice under the month it falls due in, not the month it closes in', () => {
    expect(showMonth(2026, 8)?.id).toBe(AUGUST_CLOSE_SEPTEMBER_DUE.id);
  });

  it('leaves the month the invoice merely closed in empty', () => {
    expect(showMonth(2026, 7)).toBeNull();
  });

  it('keeps consecutive periods on consecutive months', () => {
    expect(showMonth(2026, 9)?.id).toBe(SEPTEMBER_CLOSE_OCTOBER_DUE.id);
  });

  /**
   * Ordering by purchase date is the API's job — it sorts on the column, so an installment bought
   * months ago already arrives below the month's own purchases. This screen must hand that order
   * straight through: re-sorting a server page here would put the same charge in a different place
   * depending on which page it landed on.
   */
  it('renders charges in the order the API sent them', async () => {
    showMonth(2026, 8);

    const installment = charge({
      id: 'installment',
      templateId: TEMPLATE_ID,
      installmentNumber: 3,
      totalInstallments: 10,
      transactionDate: '2026-08-25',
      purchaseDate: '2026-06-25',
      createdAt: '2026-08-25T00:00:00Z',
    });
    const groceries = charge({
      id: 'groceries',
      transactionDate: '2026-08-10',
      purchaseDate: '2026-08-10',
    });
    const fuel = charge({
      id: 'fuel',
      transactionDate: '2026-08-02',
      purchaseDate: '2026-08-02',
    });

    const http = TestBed.inject(HttpTestingController);
    const requests = http.match((req) =>
      req.url.endsWith(`/invoices/${AUGUST_CLOSE_SEPTEMBER_DUE.id}/transactions`),
    );
    expect(requests).toHaveLength(1);
    requests[0].flush({
      content: [groceries, fuel, installment],
      page: 0,
      size: 2000,
      totalElements: 3,
      totalPages: 1,
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.charges().map((tx) => tx.id)).toEqual(['groceries', 'fuel', 'installment']);
  });
});
