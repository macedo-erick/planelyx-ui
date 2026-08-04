import { IsoDate, Money, Uuid } from './common';
import { Invoice } from './invoice';

/** `GET /api/dashboard?month=YYYY-MM` — every figure the dashboard shows, in one round trip. */
export interface Dashboard {
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
  readonly accountBalances: readonly AccountBalance[];
  readonly totalBalance: Money;
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

export interface CategoryBreakdown {
  readonly categoryId: Uuid;
  readonly name: string;
  readonly color: string | null;
  readonly total: Money;
}
