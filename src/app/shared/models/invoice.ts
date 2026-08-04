import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { InvoiceStatus } from './enums';

/**
 * Invoices are created implicitly by the API when a CARD_CHARGE is posted — there is no
 * create/update/delete endpoint, only read plus pay/unpay.
 */
export interface Invoice {
  readonly id: Uuid;
  readonly creditCardId: Uuid;
  readonly billingPeriodStart: IsoDate;
  readonly billingPeriodEnd: IsoDate;
  readonly dueDate: IsoDate;
  readonly totalAmount: Money;
  /**
   * Derived server-side at read time (PAID if settled, else CLOSED once past
   * `billingPeriodEnd`, else OPEN) — it can differ from the stored row, so never cache it
   * across a pay/unpay.
   */
  readonly status: InvoiceStatus;
  readonly paidAt: IsoInstant | null;
  readonly createdAt: IsoInstant;
}

export interface InvoiceFilters {
  creditCardId?: Uuid;
  status?: InvoiceStatus;
}
