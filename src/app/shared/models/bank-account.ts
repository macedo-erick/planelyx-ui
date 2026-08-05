import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { AccountType } from './enums';

export interface BankAccount {
  readonly id: Uuid;
  readonly name: string;
  readonly bankName: string;
  readonly accountType: AccountType;
  /**
   * The account's starting point, not what it holds today — transactions are applied on top.
   * For the live figure use `BankAccountBalance` from `/bank-accounts/balances`.
   */
  readonly initialBalance: Money;
  readonly currency: string;
  /** Not settable through the API — always true on create, never toggled. Display only. */
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
 */
export interface BalanceAdjustmentRequest {
  targetBalance: Money;
  /** Null means today. The balance being corrected is the one as of this date. */
  transactionDate: IsoDate | null;
}

export interface BankAccountRequest {
  name: string;
  bankName: string;
  accountType: AccountType;
  initialBalance: Money;
  /** ISO 4217, exactly 3 characters (`VARCHAR(3)` in the schema). */
  currency: string;
}
