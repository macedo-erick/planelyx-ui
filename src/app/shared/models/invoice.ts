import { IsoDate, IsoInstant, Money, MonthKey, Uuid } from './common';
import { InvoiceStatus } from './enums';

/** Invoices are created implicitly by the API when a CARD_CHARGE is posted. */
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
