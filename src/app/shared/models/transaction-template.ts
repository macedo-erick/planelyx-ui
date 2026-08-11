import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { IntervalUnit, RecurrenceType, TransactionKind } from './enums';

/** A recurring rule, and the counter of how much of it has been materialised. */
export interface TransactionTemplate {
  readonly id: Uuid;
  readonly kind: TransactionKind;
  readonly bankAccountId: Uuid | null;
  readonly creditCardId: Uuid | null;
  readonly categoryId: Uuid;
  readonly description: string;
  readonly totalAmount: Money;
  readonly recurrenceType: RecurrenceType;
  readonly intervalUnit: IntervalUnit;
  readonly startDate: IsoDate;
  readonly totalOccurrences: number | null;
  readonly occurrencesGenerated: number;
  readonly active: boolean;
  readonly createdAt: IsoInstant;
}

/** `intervalUnit` is intentionally absent — the server always sets MONTHLY. */
export interface TransactionTemplateRequest {
  kind: TransactionKind;
  bankAccountId: Uuid | null;
  creditCardId: Uuid | null;
  categoryId: Uuid;
  description: string;
  totalAmount: Money;
  recurrenceType: RecurrenceType;
  startDate: IsoDate;
  totalOccurrences: number | null;
}
