import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { TransactionKind, TransactionScope } from './enums';

/**
 * One transaction as the API holds it.
 *
 * Which owner field is set follows the kind: an account kind carries `bankAccountId`, a CARD_CHARGE
 * carries `creditCardId` and the `invoiceId` the server files it under. `templateId` is set on
 * anything materialised from a recurring rule, and the installment fields only on an INSTALLMENT
 * one, where `installmentNumber` is 1-based.
 *
 * It carries two dates because an installment needs both. `purchaseDate` is when the purchase was
 * made, the same as `transactionDate` for anything bought outright; an installment's occurrences
 * are generated a month apart, so a sofa bought on 25 January is dated 25 March inside the March
 * invoice and this is the only field that still says January.
 *
 * `paid` only means anything on an ACCOUNT_DEBIT. A card charge is settled through its invoice
 * rather than one at a time, and income is not a bill, so both are written true and the server
 * refuses to flip them. It is a reminder and nothing more — balances run to the end of the month,
 * so the money is deducted either way. See `Dashboard.billsDue`.
 */
export interface Transaction {
  readonly id: Uuid;
  readonly kind: TransactionKind;
  readonly bankAccountId: Uuid | null;
  readonly creditCardId: Uuid | null;
  readonly categoryId: Uuid;
  readonly invoiceId: Uuid | null;
  readonly templateId: Uuid | null;
  readonly installmentNumber: number | null;
  readonly totalInstallments: number | null;
  readonly amount: Money;
  readonly transactionDate: IsoDate;
  readonly purchaseDate: IsoDate;
  readonly description: string;
  readonly paid: boolean;
  readonly createdAt: IsoInstant;
}

/**
 * A transaction to write. `bankAccountId` and `creditCardId` are mutually exclusive, picked by the
 * kind.
 *
 * `paid` is worth sending only for an ACCOUNT_DEBIT the caller disagrees with the date about:
 * omitted, the server reads it off `transactionDate` — dated ahead means not yet paid, today or
 * earlier means recorded after the fact. A card charge is always paid whatever this says.
 */
export interface TransactionRequest {
  kind: TransactionKind;
  bankAccountId: Uuid | null;
  creditCardId: Uuid | null;
  categoryId: Uuid;
  amount: Money;
  transactionDate: IsoDate;
  description: string;
  paid?: boolean;
}

/**
 * PUT takes a deliberately narrower payload than POST — `kind`, `bankAccountId` and
 * `creditCardId` are immutable once created.
 *
 * `scope` says how far the edit reaches through a series, and omitted means `SINGLE`. The date is
 * only ever applied to the edited row whatever the scope — the server keeps siblings on their own.
 */
export interface TransactionUpdateRequest {
  categoryId: Uuid;
  amount: Money;
  transactionDate: IsoDate;
  description: string;
  scope?: TransactionScope;
}

/**
 * Server-side filters and paging accepted by `GET /api/transactions`. All optional, with `from` and
 * `to` inclusive and `page` zero-based.
 *
 * The same filter fields are accepted by `GET /api/transactions/summary`, which totals the
 * whole selection rather than a page.
 */
export interface TransactionFilters {
  bankAccountId?: Uuid;
  creditCardId?: Uuid;
  categoryId?: Uuid;
  kind?: TransactionKind;
  from?: IsoDate;
  to?: IsoDate;
  page?: number;
  size?: number;
}

/** `GET /api/transactions/summary` — totals across the filtered selection. */
export interface TransactionSummary {
  readonly totalIncome: Money;
  readonly totalExpense: Money;
  readonly net: Money;
  readonly count: number;
}
