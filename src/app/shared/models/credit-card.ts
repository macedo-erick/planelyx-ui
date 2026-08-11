import { IsoInstant, Money, Uuid } from './common';

/** A card as the API holds it, with its limit worked out server-side. */
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
