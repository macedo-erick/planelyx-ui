import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { TransactionKind, TransactionScope } from './enums';

export interface Transaction {
  readonly id: Uuid;
  readonly kind: TransactionKind;
  /** Set iff kind is ACCOUNT_DEBIT or ACCOUNT_CREDIT. */
  readonly bankAccountId: Uuid | null;
  /** Set iff kind is CARD_CHARGE. */
  readonly creditCardId: Uuid | null;
  readonly categoryId: Uuid;
  /** Assigned automatically for card charges; null otherwise. */
  readonly invoiceId: Uuid | null;
  /** Set when the transaction was materialized from a recurring template. */
  readonly templateId: Uuid | null;
  /** 1-based position, populated only for INSTALLMENT templates. */
  readonly installmentNumber: number | null;
  /** Total number of installments, populated only for INSTALLMENT templates. */
  readonly totalInstallments: number | null;
  readonly amount: Money;
  readonly transactionDate: IsoDate;
  /**
   * The day the purchase was made, resolved by the API.
   *
   * The same as `transactionDate` for anything bought outright. An installment's occurrences are
   * generated a month apart, so a sofa bought on 25 January is dated 25 March inside the March
   * invoice — this is the only field that still says January.
   */
  readonly purchaseDate: IsoDate;
  readonly description: string;
  /**
   * Whether this has been ticked off.
   *
   * Only meaningful on an ACCOUNT_DEBIT. A card charge is always paid — it is settled through its
   * invoice, not one at a time — and income is not a bill, so both are written true and the server
   * refuses to flip them. The server sets it on create: a debit dated ahead of today has not
   * happened yet, anything on or before today is being recorded after the fact.
   *
   * Purely a reminder. Balances run to the end of the month, so the money is already deducted
   * either way — see `Dashboard.billsDue`.
   */
  readonly paid: boolean;
  readonly createdAt: IsoInstant;
}

export interface TransactionRequest {
  kind: TransactionKind;
  /** Required for account kinds, must be null for CARD_CHARGE. */
  bankAccountId: Uuid | null;
  /** Required for CARD_CHARGE, must be null for account kinds. */
  creditCardId: Uuid | null;
  categoryId: Uuid;
  amount: Money;
  transactionDate: IsoDate;
  description: string;
}

/**
 * PUT takes a deliberately narrower payload than POST — `kind`, `bankAccountId` and
 * `creditCardId` are immutable once created.
 */
export interface TransactionUpdateRequest {
  categoryId: Uuid;
  amount: Money;
  transactionDate: IsoDate;
  description: string;
  /**
   * How far the edit reaches through a series. Omitted means `SINGLE`. The date is only ever
   * applied to the edited row, whatever the scope — the server keeps siblings on their own dates.
   */
  scope?: TransactionScope;
}

/**
 * Server-side filters and paging accepted by `GET /api/transactions`. All optional.
 *
 * The same filter fields are accepted by `GET /api/transactions/summary`, which totals the
 * whole selection rather than a page.
 */
export interface TransactionFilters {
  bankAccountId?: Uuid;
  creditCardId?: Uuid;
  categoryId?: Uuid;
  kind?: TransactionKind;
  /** Inclusive lower bound. */
  from?: IsoDate;
  /** Inclusive upper bound. */
  to?: IsoDate;
  /** Zero-based. */
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
