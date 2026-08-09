import { IsoDate, IsoInstant, Uuid } from './common';

/**
 * The `planelyx-ocr` wire contract — imported statements and the lines staged out of them.
 *
 * This is a different service from the one every other model here describes, and it speaks a
 * different dialect of money. `planelyx-api` sends a `BigDecimal` as a JSON number; `planelyx-ocr`
 * sends an integer count of minor units, because its whole safety story rests on reconciling every
 * extracted line against the total the issuer printed, and that addition has to be exact. A float
 * that drifts by a centavo over sixty lines fails a reconciliation that should pass — or, worse,
 * passes one that should fail. So nothing here is ever a `Money`.
 */

/** An exact amount: a signed count of minor units, plus the currency that gives them scale. */
export interface MinorAmount {
  readonly amountMinor: number;
  readonly currency: string;
}

/**
 * `failed` and `unsupported` are distinct and must stay so. `failed` means a parser ran and
 * something went wrong — reprocessing may succeed once it is fixed. `unsupported` means no parser
 * recognised the issuer at all, and the document is waiting on a human to say which one to use.
 */
export const INGEST_DOCUMENT_STATUSES = [
  'pending',
  'processed',
  'reviewed',
  'failed',
  'unsupported',
] as const;
export type IngestDocumentStatus = (typeof INGEST_DOCUMENT_STATUSES)[number];

export const INGEST_DOCUMENT_TYPES = ['pdf_statement', 'csv', 'ofx', 'receipt_image'] as const;
export type IngestDocumentType = (typeof INGEST_DOCUMENT_TYPES)[number];

/**
 * Richer than "expense or not" on purpose: a fatura mixes purchases with fees, interest, IOF and
 * the payment of the previous invoice. The non-purchase lines are extracted and shown even though
 * most never become an expense, because the reconciliation sums every one of them.
 */
export const INGEST_TRANSACTION_KINDS = [
  'purchase',
  'refund',
  'fee',
  'annual_fee',
  'interest',
  'iof',
  'payment',
  'fx_adjustment',
  'balance_carry',
] as const;
export type IngestTransactionKind = (typeof INGEST_TRANSACTION_KINDS)[number];

export const STAGED_TRANSACTION_STATUSES = ['pending', 'accepted', 'rejected', 'edited'] as const;
export type StagedTransactionStatus = (typeof STAGED_TRANSACTION_STATUSES)[number];

/** The fields whose extraction confidence is tracked, and which the review screen highlights. */
export const CONFIDENCE_FIELDS = [
  'purchaseDate',
  'postingDate',
  'description',
  'amount',
  'currency',
  'kind',
  'installment',
  'card',
] as const;
export type ConfidenceField = (typeof CONFIDENCE_FIELDS)[number];

/** Per-field, in [0, 1]. Absent means the parser had nothing to say about that field. */
export type FieldConfidence = Partial<Readonly<Record<ConfidenceField, number>>>;

export interface IngestDocument {
  readonly id: Uuid;
  readonly originalFilename: string;
  readonly type: IngestDocumentType;
  readonly status: IngestDocumentStatus;
  readonly issuerId: string | null;
  readonly periodStart: IsoDate | null;
  readonly periodEnd: IsoDate | null;
  readonly declaredTotal: MinorAmount | null;
  readonly parserId: string | null;
  readonly parserVersion: string | null;
  /** Staged lines still awaiting a decision — what the queue counts. */
  readonly pendingCount: number;
  /** Lines already written through to the ledger, and therefore rollback-able. */
  readonly filedCount: number;
  readonly createdAt: IsoInstant;
}

/** A card billed on the document. Last four digits only — the full number is never stored. */
export interface DocumentCard {
  readonly id: Uuid;
  readonly lastFourDigits: string;
  readonly holderName: string | null;
}

export interface Installment {
  readonly number: number;
  readonly total: number;
}

export interface ForeignExchange {
  readonly originalAmount: MinorAmount;
  readonly exchangeRate: number | null;
  readonly iof: MinorAmount | null;
}

/**
 * One staged line, as the reviewer sees it.
 *
 * `isCredit` is the field that decides whether a line can be filed at all, and it cannot be
 * resolved by the server alone: money coming back is an `ACCOUNT_CREDIT` against a bank account,
 * but there is no such thing as a negative card charge in `planelyx-api`. So the server states the
 * fact and the screen refuses the combination — a credit line pointed at a credit card — rather
 * than either side guessing.
 */
export interface StagedTransaction {
  readonly id: Uuid;
  readonly documentId: Uuid;
  readonly documentCardId: Uuid | null;
  /** When the purchase happened. May precede the statement period, which is not an error. */
  readonly purchaseDate: IsoDate;
  /** When it posted. Canonical for the ledger. */
  readonly postingDate: IsoDate;
  readonly rawDescription: string;
  /** The cleaned merchant name. Null when normalization had nothing to strip. */
  readonly normalizedDescription: string | null;
  readonly amount: MinorAmount;
  readonly kind: IngestTransactionKind;
  readonly isCredit: boolean;
  readonly installment: Installment | null;
  readonly foreignExchange: ForeignExchange | null;
  readonly cardLastFourDigits: string | null;
  readonly fieldConfidence: FieldConfidence;
  /** Computed server-side from the weakest field, so both ends agree on what gets flagged. */
  readonly needsAttention: boolean;
  readonly suggestedCategoryId: Uuid | null;
  /** Where the suggestion came from, so a guess is never shown as a fact. */
  readonly suggestionSource: 'rule' | 'manual' | null;
  /** Set when this looks like a line already seen from another source. Never auto-discarded. */
  readonly duplicateOf: Uuid | null;
  readonly status: StagedTransactionStatus;
}

export interface ValidationIssue {
  readonly severity: 'error' | 'warning';
  readonly message: string;
  /** Index into the document's staged lines, when the issue is attributable to one. */
  readonly transactionIndex?: number;
}

/**
 * The reconciliation. `ok` false means the extracted lines do not sum to the printed total, and
 * the document must not be filed until the difference is explained.
 */
export interface ValidationSummary {
  readonly ok: boolean;
  readonly extractedTotal: MinorAmount;
  readonly declaredTotal: MinorAmount | null;
  readonly issues: readonly ValidationIssue[];
}

export interface DocumentDetail {
  readonly document: IngestDocument;
  readonly cards: readonly DocumentCard[];
  readonly transactions: readonly StagedTransaction[];
  readonly validation: ValidationSummary | null;
}

/** Edits a reviewer can make to a staged line before confirming it. */
export interface StagedTransactionEdit {
  readonly normalizedDescription?: string;
  readonly amount?: MinorAmount;
  readonly purchaseDate?: IsoDate;
  readonly postingDate?: IsoDate;
  readonly kind?: IngestTransactionKind;
  readonly suggestedCategoryId?: Uuid | null;
}

/**
 * One line's filing instructions.
 *
 * The assignment lives in the request rather than in `planelyx-ocr` because that service holds no
 * catalogue of categories, cards or accounts — they belong to `planelyx-api`, and the person
 * reviewing is the one who knows which of them this line belongs to. Exactly one of
 * `bankAccountId` and `creditCardId`, matching what the API's own validator demands.
 */
export interface ConfirmLine {
  readonly id: Uuid;
  readonly categoryId: Uuid;
  readonly bankAccountId?: Uuid | null;
  readonly creditCardId?: Uuid | null;
  /** Required for a `payment` line, which settles an invoice instead of becoming an expense. */
  readonly invoiceId?: Uuid | null;
  readonly description?: string;
}

export interface ConfirmRequest {
  readonly lines: readonly ConfirmLine[];
}

/**
 * Per line, never a single verdict for the batch.
 *
 * `planelyx-api` has no batch write, so the lines are filed one at a time and a run can genuinely
 * half-succeed. Reporting that honestly is the whole point — a partial result reported as failure
 * would invite a retry that files everything twice.
 */
export interface ConfirmLineResult {
  readonly id: Uuid;
  readonly ledgerTransactionId: Uuid | null;
  readonly error: string | null;
}

export interface ConfirmResult {
  readonly filed: number;
  readonly failed: number;
  readonly results: readonly ConfirmLineResult[];
  readonly documentStatus: IngestDocumentStatus;
}

export interface RollbackLineResult {
  readonly extractedTransactionId: Uuid;
  readonly ledgerTransactionId: Uuid;
  readonly undone: boolean;
  /** True when the ledger had already lost it — someone deleted it by hand. Counts as undone. */
  readonly alreadyGone: boolean;
  readonly error: string | null;
}

export interface RollbackResult {
  readonly undone: number;
  readonly failed: number;
  readonly results: readonly RollbackLineResult[];
  readonly documentStatus: IngestDocumentStatus;
}

/** What an upload reports back, including the honest `unsupported` outcome. */
export interface IngestResult {
  readonly documentId: Uuid;
  readonly status: IngestDocumentStatus;
  readonly duplicate: boolean;
  readonly transactionCount: number;
  readonly warnings: readonly string[];
}
