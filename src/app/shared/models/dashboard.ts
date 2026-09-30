import { IsoDate, Money, MonthKey, Uuid } from './common';
import { Invoice } from './invoice';
import { Transaction } from './transaction';

/** `GET /api/dashboard?month=YYYY-MM` — every figure the dashboard shows, in one round trip. */
export interface Dashboard {
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
  readonly accountBalances: readonly AccountBalance[];
  readonly accountBalanceTotal: Money;
  readonly investmentBalances: readonly InvestmentSummary[];
  readonly investedTotal: Money;
  readonly totalBalance: Money;
  readonly netWorth: Money;
  readonly invoicesDueTotal: Money;
  readonly invoicesDueCount: number;
  readonly income: Money;
  readonly expense: Money;
  /** `income` less `expense`. */
  readonly result: Money;
  /** The same subtraction for the month before, for comparison. */
  readonly previousResult: Money;
  /**
   * Income and expense for the twelve months ending with this one, oldest first. Every month is
   * present, a quiet one at zero, and the last is this month's own `income` and `expense`.
   */
  readonly trend: readonly MonthMovement[];
  readonly categoryBreakdown: readonly CategoryBreakdown[];
  /**
   * The invoices `invoicesDueTotal` adds up, earliest first, so an overdue one from before the
   * month leads. Every one comes back; `invoicesDueCount` is their number.
   */
  readonly invoicesDue: readonly Invoice[];
  /** The month's invoices that are already settled. */
  readonly invoicesPaid: readonly Invoice[];
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

/** `contributed` is net of redemptions, so the difference against `balance` is the return. */
export interface InvestmentSummary {
  readonly investmentId: Uuid;
  readonly name: string;
  readonly institution: string;
  readonly currency: string;
  readonly balance: Money;
  readonly contributed: Money;
}

/** One month of `Dashboard.trend`. */
export interface MonthMovement {
  readonly month: MonthKey;
  readonly income: Money;
  readonly expense: Money;
}

/** One slice of `expense`. The slices total `expense`, so the chart agrees with the tile. */
export interface CategoryBreakdown {
  readonly categoryId: Uuid | null;
  readonly name: string;
  readonly color: string | null;
  readonly total: Money;
}
