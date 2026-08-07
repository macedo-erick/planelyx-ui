import { IsoInstant, Money, Uuid } from './common';

/**
 * A card as the API holds it, with its limit worked out server-side.
 *
 * `usedLimit` totals the card's invoices that have not been paid yet, and `availableLimit` is the
 * limit less that — negative once the card is over its limit.
 *
 * `closingDay` and `dueDay` are days of month, 1–31, clamped to the month's length server-side.
 * The due day rolls into the next month when it is on or before the closing day.
 */
export interface CreditCard {
  readonly id: Uuid;
  readonly bankAccountId: Uuid;
  readonly name: string;
  readonly brand: string;
  readonly creditLimit: Money;
  readonly usedLimit: Money;
  readonly availableLimit: Money;
  readonly closingDay: number;
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
