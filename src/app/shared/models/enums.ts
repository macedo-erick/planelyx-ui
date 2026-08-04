/**
 * Mirrors of the backend enums. Modelled as const arrays + union types rather than TS
 * `enum` so the wire values and the type stay in one place and can be iterated for
 * dropdown options.
 */

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const TRANSACTION_KINDS = ['ACCOUNT_DEBIT', 'ACCOUNT_CREDIT', 'CARD_CHARGE'] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const RECURRENCE_TYPES = ['FIXED_INDEFINITE', 'FIXED_COUNT', 'INSTALLMENT'] as const;
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

export const INVOICE_STATUSES = ['OPEN', 'CLOSED', 'PAID'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * How far an edit or delete reaches through a series.
 *
 * Only meaningful for a transaction generated from a template (one with a `templateId`);
 * a one-off transaction is always `SINGLE`.
 */
export const TRANSACTION_SCOPES = ['SINGLE', 'FUTURE', 'ALL'] as const;
export type TransactionScope = (typeof TRANSACTION_SCOPES)[number];

/** The backend only ever sets `MONTHLY`; it is not part of any request payload. */
export const INTERVAL_UNITS = ['MONTHLY'] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

/** True when the kind must carry a `creditCardId` and must not carry a `bankAccountId`. */
export function isCardKind(kind: TransactionKind): boolean {
  return kind === 'CARD_CHARGE';
}

/** True when the kind adds money to an account (as opposed to taking it out). */
export function isInflow(kind: TransactionKind): boolean {
  return kind === 'ACCOUNT_CREDIT';
}
