import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { IntervalUnit, RecurrenceType, TransactionKind } from './enums';

export interface TransactionTemplate {
  readonly id: Uuid;
  readonly kind: TransactionKind;
  readonly bankAccountId: Uuid | null;
  readonly creditCardId: Uuid | null;
  readonly categoryId: Uuid;
  readonly description: string;
  /** For INSTALLMENT this is the full purchase price, split across occurrences. */
  readonly totalAmount: Money;
  readonly recurrenceType: RecurrenceType;
  readonly intervalUnit: IntervalUnit;
  readonly startDate: IsoDate;
  /** Null for FIXED_INDEFINITE. */
  readonly totalOccurrences: number | null;
  readonly occurrencesGenerated: number;
  /** Set false by DELETE (soft deactivate), and by the server once generation completes. */
  readonly active: boolean;
  readonly createdAt: IsoInstant;
}

/**
 * `intervalUnit` is intentionally absent — the server always sets MONTHLY.
 *
 * Recurrence rules enforced server-side (400 on violation):
 * - FIXED_INDEFINITE: `totalOccurrences` must be null
 * - FIXED_COUNT:      `totalOccurrences` >= 1
 * - INSTALLMENT:      `kind` must be CARD_CHARGE and `totalOccurrences` >= 2
 */
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
