import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FieldTree } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { Invoice } from '../../shared/models/invoice';
import { AdjustInvoiceDialog } from './adjust-invoice-dialog';
import { provideTestingTransloco } from '../../../testing/transloco';

interface AdjustInvoiceInternals {
  f: FieldTree<{ targetAmount: number | null }>;
  delta(): number;
  deltaLabel(): string;
  unchanged(): boolean;
  onSubmit(): void;
}

const INVOICE_ID = '44444444-4444-4444-4444-444444444444';

const INVOICE: Invoice = {
  id: INVOICE_ID,
  creditCardId: '22222222-2222-2222-2222-222222222222',
  referenceMonth: '2026-08',
  billingPeriodStart: '2026-07-11',
  billingPeriodEnd: '2026-08-10',
  dueDate: '2026-08-17',
  totalAmount: 200,
  status: 'OPEN',
  paidAt: null,
  createdAt: '2026-07-11T00:00:00Z',
};

/**
 * The invoice total is the sum of its charges, so correcting it downwards has to be able to
 * produce a negative difference — the case most likely to be broken by a well-meaning
 * "amounts are positive" change on either side of the wire.
 */
describe('AdjustInvoiceDialog', () => {
  let fixture: ComponentFixture<AdjustInvoiceDialog>;
  let http: HttpTestingController;
  /** Protected members are reached deliberately; this dialog has no public test surface. */
  let dialog: AdjustInvoiceInternals;

  /** Every post is gated behind a confirm; accepting it is what actually fires the request. */
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

    fixture = TestBed.createComponent(AdjustInvoiceDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('invoice', INVOICE);
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);
    http.match(() => true).forEach((req) => req.flush([]));

    dialog = fixture.componentInstance as unknown as AdjustInvoiceInternals;
  });

  it('opens on the total it is replacing', () => {
    expect(dialog.f.targetAmount().value()).toBe(200);
    expect(dialog.unchanged()).toBe(true);
  });

  it('reports a lower total as a negative difference', () => {
    dialog.f.targetAmount().value.set(150);
    fixture.detectChanges();

    expect(dialog.delta()).toBe(-50);
    expect(dialog.deltaLabel()).toMatch(/^−/);
  });

  it('posts the target total rather than the difference', () => {
    acceptConfirmation();

    dialog.f.targetAmount().value.set(320);
    fixture.detectChanges();
    dialog.onSubmit();

    const req = http.expectOne(`${environment.apiUrl}/invoices/${INVOICE_ID}/adjust`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ targetAmount: 320 });
  });

  it('posts nothing when the total already matches', () => {
    acceptConfirmation();

    dialog.onSubmit();

    http.expectNone(`${environment.apiUrl}/invoices/${INVOICE_ID}/adjust`);
  });
});
