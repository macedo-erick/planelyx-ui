import { IsoDate, IsoInstant, Uuid } from './common';

/** The `planelyx-ocr` wire contract — imported statements and the lines staged out of them. */

/** An exact amount: a signed count of minor units, plus the currency that gives them scale. */
export interface MinorAmount {
  readonly amountMinor: number;
  readonly currency: string;
}

/** `failed` and `unsupported` are distinct and must stay so. */
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

/** Richer than "expense or not" on purpose: a fatura mixes purchases with fees. */
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
  readonly pendingCount: number;
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

/** One staged line, as the reviewer sees it. */
export interface StagedTransaction {
  readonly id: Uuid;
  readonly documentId: Uuid;
  readonly documentCardId: Uuid | null;
  readonly purchaseDate: IsoDate;
  readonly postingDate: IsoDate;
  readonly rawDescription: string;
  readonly normalizedDescription: string | null;
  readonly amount: MinorAmount;
  readonly kind: IngestTransactionKind;
  readonly isCredit: boolean;
  readonly installment: Installment | null;
  readonly foreignExchange: ForeignExchange | null;
  readonly cardLastFourDigits: string | null;
  readonly fieldConfidence: FieldConfidence;
  readonly needsAttention: boolean;
  readonly suggestedCategoryId: Uuid | null;
  readonly suggestionSource: 'rule' | 'manual' | null;
  readonly duplicateOf: Uuid | null;
  readonly status: StagedTransactionStatus;
}

export interface ValidationIssue {
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly transactionIndex?: number;
}

/** The reconciliation. */
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

/** One line's filing instructions. */
export interface ConfirmLine {
  readonly id: Uuid;
  readonly categoryId: Uuid;
  readonly bankAccountId?: Uuid | null;
  readonly creditCardId?: Uuid | null;
  readonly invoiceId?: Uuid | null;
  readonly description?: string;
}

export interface ConfirmRequest {
  readonly lines: readonly ConfirmLine[];
}

/** Per line, never a single verdict for the batch. */
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

/** How far along an import is, in the only two phases that are actually distinguishable. */
export type UploadProgress =
  | { readonly phase: 'sending'; readonly percent: number | null }
  | { readonly phase: 'reading' }
  | { readonly phase: 'done'; readonly result: IngestResult };
