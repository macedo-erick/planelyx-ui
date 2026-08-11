import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { AccountType } from './enums';

/** A bank account as the API holds it. */
export interface BankAccount {
  readonly id: Uuid;
  readonly name: string;
  readonly bankName: string;
  readonly accountType: AccountType;
  readonly initialBalance: Money;
  readonly currency: string;
  readonly active: boolean;
  readonly createdAt: IsoInstant;
}

/** An account's balance at the close of `asOf`. */
export interface BankAccountBalance {
  readonly bankAccountId: Uuid;
  readonly currency: string;
  readonly balance: Money;
  readonly asOf: IsoDate;
}

/** A balance to set the account to, not an amount to move. */
export interface BalanceAdjustmentRequest {
  targetBalance: Money;
  transactionDate: IsoDate | null;
  description?: string;
}

/** `currency` is ISO 4217, exactly 3 characters (`VARCHAR(3)` in the schema). */
export interface BankAccountRequest {
  name: string;
  bankName: string;
  accountType: AccountType;
  initialBalance: Money;
  currency: string;
}
