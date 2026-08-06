import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { provideTestingTransloco } from '../../../testing/transloco';
import { Invoice } from '../../shared/models/invoice';
import { InvoicesPage } from './invoices-page';

interface InvoicesPageInternals {
  selectedCardId: { set(value: string | null): void };
  selectedMonth: { set(value: Date): void };
  invoice(): Invoice | null;
}

const CARD_ID = '22222222-2222-2222-2222-222222222222';

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
});
