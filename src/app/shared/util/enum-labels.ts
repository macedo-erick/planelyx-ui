import {
  ACCOUNT_TYPES,
  AccountType,
  CATEGORY_TYPES,
  CategoryType,
  INVOICE_STATUSES,
  InvoiceStatus,
  RECURRENCE_TYPES,
  RecurrenceType,
  TRANSACTION_KINDS,
  TransactionKind,
} from '../models/enums';

/** Option shape consumed by `planelyx-select`. */
export interface SelectOption<T> {
  readonly label: string;
  readonly value: T;
  readonly icon?: string;
}

function toOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): SelectOption<T>[] {
  return values.map((value) => ({ label: labels[value], value }));
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
};

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  EXPENSE: 'Expense',
  INCOME: 'Income',
};

/**
 * The API names are ledger-side. If you prefer the BR convention (débito = account
 * purchase, crédito = card purchase), only these strings change.
 */
export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  ACCOUNT_DEBIT: 'Account expense',
  ACCOUNT_CREDIT: 'Account income',
  CARD_CHARGE: 'Card charge',
};

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  FIXED_INDEFINITE: 'Fixed — no end date',
  FIXED_COUNT: 'Fixed — set number of times',
  INSTALLMENT: 'Installments',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  PAID: 'Paid',
};

/** PrimeNG `severity` for the status tag. */
export const INVOICE_STATUS_SEVERITY: Record<InvoiceStatus, 'success' | 'warn' | 'info'> = {
  OPEN: 'info',
  CLOSED: 'warn',
  PAID: 'success',
};

export const ACCOUNT_TYPE_OPTIONS = toOptions(ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS);
export const CATEGORY_TYPE_OPTIONS = toOptions(CATEGORY_TYPES, CATEGORY_TYPE_LABELS);
export const TRANSACTION_KIND_OPTIONS = toOptions(TRANSACTION_KINDS, TRANSACTION_KIND_LABELS);
export const RECURRENCE_TYPE_OPTIONS = toOptions(RECURRENCE_TYPES, RECURRENCE_TYPE_LABELS);
export const INVOICE_STATUS_OPTIONS = toOptions(INVOICE_STATUSES, INVOICE_STATUS_LABELS);
