import { IsoDate, Money, Uuid } from './common';
import { Invoice } from './invoice';
import { Transaction } from './transaction';

/**
 * `GET /api/dashboard?month=YYYY-MM` — every figure the dashboard shows, in one round trip.
 *
 * Balances are cumulative as of the end of that month, which is what makes stepping forward a
 * forecast: installments and recurring occurrences already exist as rows, so a future month simply
 * includes rows that are there.
 *
 * Three figures are easy to double count. `accountBalanceTotal` is the plain sum of the accounts.
 * `invoicesDueTotal` covers the unpaid invoices falling due by `periodEnd` — committed money that
 * has not left any one account yet. `totalBalance` is the first less the second, so it deliberately
 * does not match the accounts listed beside it. An invoice already paid is in neither: paying one
 * posts a settlement, so it has left the balances already.
 *
 * `billsDue` is not a fourth figure of that kind. It lists the month's recurring account bills
 * still to be ticked off, oldest first, and every one is an ordinary transaction already inside
 * `accountBalanceTotal` — a reminder, nothing more. Subtracting `billsDueTotal` from anything
 * counts the same money twice.
 *
 * `beyondGeneratedOccurrences` says the month sits past the last generated occurrence of an
 * open-ended recurring rule, so its figures are incomplete rather than simply low.
 */
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

/**
 * One slice of `expense`. The slices total `expense`, so the chart agrees with the tile.
 *
 * A null `categoryId` marks the single remainder slice carrying every category past the largest
 * few. It stands for no one category, which is how it is told apart and labelled in the reader's
 * language.
 */
export interface CategoryBreakdown {
  readonly categoryId: Uuid | null;
  readonly name: string;
  readonly color: string | null;
  readonly total: Money;
}
