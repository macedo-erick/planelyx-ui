import { IsoInstant, Money, Uuid } from './common';
import { AccountType } from './enums';

export interface BankAccount {
  readonly id: Uuid;
  readonly name: string;
  readonly bankName: string;
  readonly accountType: AccountType;
  readonly initialBalance: Money;
  readonly currency: string;
  /** Not settable through the API — always true on create, never toggled. Display only. */
  readonly active: boolean;
  readonly createdAt: IsoInstant;
}

export interface BankAccountRequest {
  name: string;
  bankName: string;
  accountType: AccountType;
  initialBalance: Money;
  /** ISO 4217, exactly 3 characters (`VARCHAR(3)` in the schema). */
  currency: string;
}
