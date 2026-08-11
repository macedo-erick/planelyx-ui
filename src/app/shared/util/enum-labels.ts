import { computed, Signal } from '@angular/core';
import { translateObjectSignal } from '@jsverse/transloco';

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

/** Enum labels, and the select options built from them. */

/** Option shape consumed by `planelyx-select`. */
export interface SelectOption<T> {
  readonly label: string;
  readonly value: T;
  readonly icon?: string;
}

function labels<T extends string>(group: string): Signal<Record<T, string>> {
  const translations = translateObjectSignal(`enums.${group}`);

  return computed(() => translations() as Record<T, string>);
}

function options<T extends string>(
  values: readonly T[],
  source: Signal<Record<T, string>>,
): Signal<SelectOption<T>[]> {
  return computed(() => values.map((value) => ({ label: source()[value] ?? value, value })));
}

export function accountTypeLabels(): Signal<Record<AccountType, string>> {
  return labels('accountType');
}

export function categoryTypeLabels(): Signal<Record<CategoryType, string>> {
  return labels('categoryType');
}

/** The API names are ledger-side. */
export function transactionKindLabels(): Signal<Record<TransactionKind, string>> {
  return labels('transactionKind');
}

export function recurrenceTypeLabels(): Signal<Record<RecurrenceType, string>> {
  return labels('recurrenceType');
}

export function invoiceStatusLabels(): Signal<Record<InvoiceStatus, string>> {
  return labels('invoiceStatus');
}

export function accountTypeOptions(): Signal<SelectOption<AccountType>[]> {
  return options(ACCOUNT_TYPES, accountTypeLabels());
}

export function categoryTypeOptions(): Signal<SelectOption<CategoryType>[]> {
  return options(CATEGORY_TYPES, categoryTypeLabels());
}

export function transactionKindOptions(): Signal<SelectOption<TransactionKind>[]> {
  return options(TRANSACTION_KINDS, transactionKindLabels());
}

export function recurrenceTypeOptions(): Signal<SelectOption<RecurrenceType>[]> {
  return options(RECURRENCE_TYPES, recurrenceTypeLabels());
}

export function invoiceStatusOptions(): Signal<SelectOption<InvoiceStatus>[]> {
  return options(INVOICE_STATUSES, invoiceStatusLabels());
}

/** PrimeNG `severity` for the status tag. Still a constant — a colour is not language. */
export const INVOICE_STATUS_SEVERITY: Record<InvoiceStatus, 'success' | 'warn' | 'info'> = {
  OPEN: 'info',
  CLOSED: 'warn',
  PAID: 'success',
};

/** Translates the names of the categories seeded for every user. */
export function defaultCategoryNames(): Signal<(name: string) => string> {
  const translations = translateObjectSignal('categoryDefaults');

  return computed(() => {
    const names = translations() as Record<string, string>;
    return (name: string) => names[name] ?? name;
  });
}
