import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { TransactionKind, TransactionScope } from './enums';

/** One transaction as the API holds it. */
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

/** A transaction to write. */
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

/** PUT takes a deliberately narrower payload than POST. */
export interface TransactionUpdateRequest {
  categoryId: Uuid;
  amount: Money;
  transactionDate: IsoDate;
  description: string;
  scope?: TransactionScope;
}

/** Server-side filters and paging accepted by `GET /api/transactions`. */
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
