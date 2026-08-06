import { IsoDate, Money, Uuid } from './common';
import { Invoice } from './invoice';

/** `GET /api/dashboard?month=YYYY-MM` — every figure the dashboard shows, in one round trip. */
export interface Dashboard {
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
  readonly accountBalances: readonly AccountBalance[];
  /** `accountBalances` summed, so the subtraction below can be shown rather than explained. */
  readonly accountBalanceTotal: Money;
  /**
   * `accountBalanceTotal` less `invoicesDueTotal` — so it deliberately does not match that sum.
   * An unpaid card invoice is committed money that has not left any one account yet, so it comes
   * off the total only. Invoices already paid are not deducted here and need not be: paying one
   * posts a settlement against an account, so it has already left the balances above.
   */
  readonly totalBalance: Money;
  /** Unpaid invoices falling due on or before `periodEnd`, already deducted from the total. */
  readonly invoicesDueTotal: Money;
  readonly invoicesDueCount: number;
  readonly income: Money;
  readonly expense: Money;
  readonly categoryBreakdown: readonly CategoryBreakdown[];
  readonly outstandingInvoiceTotal: Money;
  readonly upcomingInvoices: readonly Invoice[];
  /**
   * The month sits past the last generated occurrence of an open-ended recurring rule, so its
   * figures are incomplete rather than simply low. Surfaced to the user, not silently ignored.
   */
  readonly beyondGeneratedOccurrences: boolean;
}

export interface AccountBalance {
  readonly bankAccountId: Uuid;
  readonly name: string;
  readonly bankName: string;
  readonly currency: string;
  /** Cumulative as of `periodEnd`, not movement within the month. */
  readonly balance: Money;
}

/**
 * One slice of `expense`. The slices total `expense`, so the chart agrees with the tile.
 */
export interface CategoryBreakdown {
  /**
   * Null on the single remainder slice carrying every category past the largest few. It stands
   * for no one category, which is how it is told apart and labelled in the reader's language.
   */
  readonly categoryId: Uuid | null;
  readonly name: string;
  readonly color: string | null;
  readonly total: Money;
}
