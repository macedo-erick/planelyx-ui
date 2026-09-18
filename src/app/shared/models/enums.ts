/** Mirrors of the backend enums. */

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const INVESTMENT_TYPES = [
  'FIXED_INCOME',
  'FUNDS',
  'STOCKS',
  'CRYPTO',
  'PENSION',
  'OTHER',
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

/** The kinds a user may file by hand. This is what the transaction form offers. */
export const FILABLE_TRANSACTION_KINDS = [
  'ACCOUNT_DEBIT',
  'ACCOUNT_CREDIT',
  'CARD_CHARGE',
] as const;
export type FilableTransactionKind = (typeof FILABLE_TRANSACTION_KINDS)[number];

/**
 * The kinds only the API writes. They still arrive on every read, which is why they belong in
 * `TransactionKind` — leaving `INVOICE_PAYMENT` out was a lie about what `Transaction.kind` holds.
 */
export const DERIVED_TRANSACTION_KINDS = [
  'INVOICE_PAYMENT',
  'INVESTMENT_CONTRIBUTION',
  'INVESTMENT_REDEMPTION',
  'INVESTMENT_YIELD',
  'INVESTMENT_LOSS',
] as const;
export type DerivedTransactionKind = (typeof DERIVED_TRANSACTION_KINDS)[number];

/** Every kind the API can return. */
export const TRANSACTION_KINDS = [
  ...FILABLE_TRANSACTION_KINDS,
  ...DERIVED_TRANSACTION_KINDS,
] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const RECURRENCE_TYPES = ['FIXED_INDEFINITE', 'FIXED_COUNT', 'INSTALLMENT'] as const;
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

export const INVOICE_STATUSES = ['OPEN', 'CLOSED', 'PAID'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** How far an edit or delete reaches through a series. */
export const TRANSACTION_SCOPES = ['SINGLE', 'FUTURE', 'ALL'] as const;
export type TransactionScope = (typeof TRANSACTION_SCOPES)[number];

/** The backend only ever sets `MONTHLY`; it is not part of any request payload. */
export const INTERVAL_UNITS = ['MONTHLY'] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

/** True when the kind must carry a `creditCardId` and must not carry a `bankAccountId`. */
export function isCardKind(kind: TransactionKind): boolean {
  return kind === 'CARD_CHARGE';
}

/**
 * How the kind moves the bank account it names: 1 in, -1 out, 0 when it names none. Mirrors
 * `TransactionKind.accountSign()`; a redemption is an inflow that is not a credit.
 */
export function accountSign(kind: TransactionKind): -1 | 0 | 1 {
  switch (kind) {
    case 'ACCOUNT_CREDIT':
    case 'INVESTMENT_REDEMPTION':
      return 1;
    case 'ACCOUNT_DEBIT':
    case 'INVOICE_PAYMENT':
    case 'INVESTMENT_CONTRIBUTION':
      return -1;
    default:
      return 0;
  }
}

/** The same for the investment leg — the other half of a contribution or a redemption. */
export function investmentSign(kind: TransactionKind): -1 | 0 | 1 {
  switch (kind) {
    case 'INVESTMENT_CONTRIBUTION':
    case 'INVESTMENT_YIELD':
      return 1;
    case 'INVESTMENT_REDEMPTION':
    case 'INVESTMENT_LOSS':
      return -1;
    default:
      return 0;
  }
}

/** Money spent. A closed list, so a kind added later counts as nothing until named. */
export function isSpending(kind: TransactionKind): boolean {
  return kind === 'ACCOUNT_DEBIT' || kind === 'CARD_CHARGE';
}

/**
 * How the kind moves the month's income: 1 earned, -1 given back, 0 neither. Yield adds and a
 * loss subtracts, so a return that reverses reports no income; a redemption moves money the owner
 * already had and counts as nothing.
 */
export function incomeSign(kind: TransactionKind): -1 | 0 | 1 {
  switch (kind) {
    case 'ACCOUNT_CREDIT':
    case 'INVESTMENT_YIELD':
      return 1;
    case 'INVESTMENT_LOSS':
      return -1;
    default:
      return 0;
  }
}

/** True when the API posted the row rather than the user, so it cannot be edited in place. */
export function isDerived(kind: TransactionKind): kind is DerivedTransactionKind {
  return (DERIVED_TRANSACTION_KINDS as readonly string[]).includes(kind);
}

/** Which way a row reads in a list: the account leg where there is one, else the investment's. */
export function flowSign(kind: TransactionKind): -1 | 0 | 1 {
  const account = accountSign(kind);

  return account !== 0 ? account : investmentSign(kind);
}
