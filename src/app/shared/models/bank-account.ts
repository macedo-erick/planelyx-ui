import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { AccountType } from './enums';

/**
 * A bank account as the API holds it.
 *
 * `initialBalance` is the account's starting point, not what it holds today — transactions are
 * applied on top of it. For the live figure use `BankAccountBalance` from `/bank-accounts/balances`.
 *
 * `active` is not settable through the API: always true on create, never toggled. Display only.
 */
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

/**
 * An account's balance at the close of `asOf`, which the API defaults to the end of the
 * current month — the same figure and the same meaning as the dashboard's.
 */
export interface BankAccountBalance {
  readonly bankAccountId: Uuid;
  readonly currency: string;
  readonly balance: Money;
  readonly asOf: IsoDate;
}

/**
 * A balance to set the account to, not an amount to move. The API posts the difference as an
 * adjustment transaction and answers 204 when the balance already matched.
 *
 * A null `transactionDate` means today, and it is the date whose balance is corrected. Omitting
 * `description` leaves the user reading "Balance adjustment" whatever language they are in — the
 * API holds no translations.
 */
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
