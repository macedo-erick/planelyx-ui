import { IsoInstant, Money, Uuid } from './common';

export interface CreditCard {
  readonly id: Uuid;
  readonly bankAccountId: Uuid;
  readonly name: string;
  readonly brand: string;
  readonly creditLimit: Money;
  /** Total of the card's invoices that have not been paid yet. Derived server-side. */
  readonly usedLimit: Money;
  /** `creditLimit - usedLimit`. Negative once the card is over its limit. */
  readonly availableLimit: Money;
  /** Day of month the billing period closes, 1–31 (clamped to month length server-side). */
  readonly closingDay: number;
  /** Day of month the invoice is due, 1–31. Rolls to the next month when <= closingDay. */
  readonly dueDay: number;
  readonly active: boolean;
  readonly createdAt: IsoInstant;
}

export interface CreditCardRequest {
  bankAccountId: Uuid;
  name: string;
  brand: string;
  creditLimit: Money;
  closingDay: number;
  dueDay: number;
}
