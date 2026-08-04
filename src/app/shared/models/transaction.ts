import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { TransactionKind } from './enums';

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
  readonly amount: Money;
  readonly transactionDate: IsoDate;
  readonly description: string;
  /** Hardcoded true on create by the API and not settable. Display only. */
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
}

/** Server-side filters accepted by `GET /api/transactions`. All optional. */
export interface TransactionFilters {
  bankAccountId?: Uuid;
  creditCardId?: Uuid;
  categoryId?: Uuid;
  /** Inclusive lower bound. */
  from?: IsoDate;
  /** Inclusive upper bound. */
  to?: IsoDate;
}
