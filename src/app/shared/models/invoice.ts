import { IsoDate, IsoInstant, Money, MonthKey, Uuid } from './common';
import { InvoiceStatus } from './enums';

/**
 * Invoices are created implicitly by the API when a CARD_CHARGE is posted — there is no
 * create or update endpoint, only read, pay/unpay, adjust and delete.
 *
 * `referenceMonth` is the month this invoice is known by — the one it falls **due** in, not the one
 * it closes in. A card closing on the 28th and due on the 5th produces a period running 29 Jul –
 * 28 Aug that its owner calls the September invoice, because September is when it is paid. Always
 * key an invoice's month on it rather than deriving one from the dates: doing the latter is what
 * once had the invoices screen and the dashboard disagree by a month.
 *
 * `status` is derived server-side at read time (PAID if settled, else CLOSED once past
 * `billingPeriodEnd`, else OPEN), so it can differ from the stored row — never cache it across a
 * pay or unpay.
 */
export interface Invoice {
  readonly id: Uuid;
  readonly creditCardId: Uuid;
  readonly referenceMonth: MonthKey;
  readonly billingPeriodStart: IsoDate;
  readonly billingPeriodEnd: IsoDate;
  readonly dueDate: IsoDate;
  readonly totalAmount: Money;
  readonly status: InvoiceStatus;
  readonly paidAt: IsoInstant | null;
  readonly createdAt: IsoInstant;
}

export interface InvoiceFilters {
  creditCardId?: Uuid;
  status?: InvoiceStatus;
}
