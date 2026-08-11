import { IsoDate, Money, Uuid } from './common';
import { Invoice } from './invoice';
import { Transaction } from './transaction';

/** `GET /api/dashboard?month=YYYY-MM` — every figure the dashboard shows, in one round trip. */
export interface Dashboard {
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
  readonly accountBalances: readonly AccountBalance[];
  readonly accountBalanceTotal: Money;
  readonly totalBalance: Money;
  readonly invoicesDueTotal: Money;
  readonly invoicesDueCount: number;
  readonly income: Money;
  readonly expense: Money;
  readonly categoryBreakdown: readonly CategoryBreakdown[];
  readonly outstandingInvoiceTotal: Money;
  readonly upcomingInvoices: readonly Invoice[];
  readonly billsDue: readonly Transaction[];
  readonly billsDueTotal: Money;
  readonly billsDueCount: number;
  readonly beyondGeneratedOccurrences: boolean;
}

/** The balance is cumulative as of `periodEnd`, not movement within the month. */
export interface AccountBalance {
  readonly bankAccountId: Uuid;
  readonly name: string;
  readonly bankName: string;
  readonly currency: string;
  readonly balance: Money;
}

/** One slice of `expense`. The slices total `expense`, so the chart agrees with the tile. */
export interface CategoryBreakdown {
  readonly categoryId: Uuid | null;
  readonly name: string;
  readonly color: string | null;
  readonly total: Money;
}
