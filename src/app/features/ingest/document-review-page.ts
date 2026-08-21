import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';

import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { Uuid } from '../../shared/models/common';
import { ConfirmLine, MinorAmount, StagedTransaction } from '../../shared/models/ingest';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { shortDate } from '../../shared/util/date-format';
import { formatMinor, majorToMinor, minorToMajor } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CurrencyService } from '../bank-accounts/currency.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { IngestService } from './ingest.service';

/** Where a document's lines are filed: one card, or one account, for the whole statement. */
interface LedgerTarget {
  readonly kind: 'card' | 'account';
  readonly id: Uuid;
}

/** Why a line cannot be filed. Null means it can. */
type BlockedReason = 'payment' | 'balanceCarry' | 'creditOnCard' | 'decided' | null;

/** The review screen — the only door to the ledger. */
@Component({
  selector: 'planelyx-document-review-page',
  imports: [
    FormsModule,
    Button,
    Checkbox,
    Select,
    Tag,
    ConfirmDialog,
    PlanelyxMoneyInput,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
  ],
  providers: [ConfirmationService],
  templateUrl: './document-review-page.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class DocumentReviewPage {
  readonly id = input.required<Uuid>();

  protected readonly service = inject(IngestService);
  private readonly categories = inject(CategoryService);
  private readonly cards = inject(CreditCardService);
  private readonly accounts = inject(BankAccountService);
  private readonly currencies = inject(CurrencyService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  protected readonly t = injectTranslate();

  protected readonly busy = signal(false);

  constructor() {
    effect(() => this.service.open(this.id()));
  }

  protected readonly detail = computed(() => this.service.detail.value());
  protected readonly document = computed(() => this.detail()?.document ?? null);
  protected readonly validation = computed(() => this.detail()?.validation ?? null);
  protected readonly lines = computed(() => this.detail()?.transactions ?? []);

  /** Rows the parser skipped or corrected. For a hand-filled CSV this is the only trace of them. */
  protected readonly warnings = computed(() => this.document()?.warnings ?? []);

  protected readonly categoryOptions = computed(() =>
    this.categories.selectable().map((category) => ({
      label: this.categories.displayName(category),
      value: category.id,
    })),
  );

  protected readonly targetOptions = computed(() => [
    ...this.cards.items().map((card) => ({
      label: `${this.t('ingest.targetKind.card')} · ${card.name}`,
      value: { kind: 'card', id: card.id } as LedgerTarget,
    })),
    ...this.accounts.items().map((account) => ({
      label: `${this.t('ingest.targetKind.account')} · ${account.name}`,
      value: { kind: 'account', id: account.id } as LedgerTarget,
    })),
  ]);

  protected readonly target = signal<LedgerTarget | null>(null);

  /**
   * The target is what fixes the currency: `planelyx-ocr` reports the issuer's default on every
   * line and has no way to know which of the reader's accounts the statement belongs to.
   */
  private readonly targetCurrency = computed(() => {
    const target = this.target();

    return target
      ? this.currencies.forSource({
          bankAccountId: target.kind === 'account' ? target.id : null,
          creditCardId: target.kind === 'card' ? target.id : null,
        })
      : null;
  });

  /** Falls back to what the parser said, which is all there is before a target is picked. */
  protected currencyFor(amount: MinorAmount): string {
    return this.targetCurrency() ?? amount.currency;
  }

  protected readonly categoryByLine = linkedSignal<
    readonly StagedTransaction[],
    Record<Uuid, Uuid | null>
  >({
    source: () => this.lines(),
    computation: (lines, previous) => {
      const chosen: Record<Uuid, Uuid | null> = {};

      for (const line of lines) {
        chosen[line.id] = previous?.value[line.id] ?? line.suggestedCategoryId;
      }

      return chosen;
    },
  });

  protected readonly selectedIds = signal<ReadonlySet<Uuid>>(new Set());

  protected readonly selectableLines = computed(() =>
    this.lines().filter((line) => this.blockedReason(line) === null),
  );

  protected readonly allSelected = computed(() => {
    const selectable = this.selectableLines();

    return selectable.length > 0 && selectable.every((line) => this.selectedIds().has(line.id));
  });

  protected readonly missingCategory = computed(() =>
    [...this.selectedIds()].filter((id) => !this.categoryByLine()[id]),
  );

  protected readonly canConfirm = computed(
    () =>
      !this.busy() &&
      this.selectedIds().size > 0 &&
      this.target() !== null &&
      this.missingCategory().length === 0,
  );

  protected readonly canRollback = computed(() => (this.document()?.filedCount ?? 0) > 0);

  protected readonly canDelete = computed(() => (this.document()?.filedCount ?? 0) === 0);

  /** Why a line is not selectable — and it is a reason, never a silent omission. */
  protected blockedReason(line: StagedTransaction): BlockedReason {
    if (line.status !== 'pending' && line.status !== 'edited') {
      return 'decided';
    }

    if (line.kind === 'payment') {
      return 'payment';
    }

    if (line.kind === 'balance_carry') {
      return 'balanceCarry';
    }

    if (line.isCredit && this.target()?.kind === 'card') {
      return 'creditOnCard';
    }

    return null;
  }

  protected blockedLabel(line: StagedTransaction): string | null {
    const reason = this.blockedReason(line);

    return reason === null ? null : this.t(`ingest.blocked.${reason}`);
  }

  protected isSelected(id: Uuid): boolean {
    return this.selectedIds().has(id);
  }

  protected toggle(line: StagedTransaction, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(line.id);
      } else {
        next.delete(line.id);
      }

      return next;
    });
  }

  protected toggleAll(checked: boolean): void {
    this.selectedIds.set(
      checked ? new Set(this.selectableLines().map((line) => line.id)) : new Set(),
    );
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected readonly bulkBarClasses = computed(() =>
    this.selectedIds().size > 0
      ? 'border-[var(--p-primary-color)] bg-[var(--p-highlight-background)]'
      : 'border-[var(--p-content-border-color)] bg-[var(--p-content-background)]',
  );

  protected cardClasses(line: StagedTransaction): string {
    const border = this.isSelected(line.id)
      ? 'border-[var(--p-primary-color)]'
      : 'border-[var(--p-content-border-color)]';

    const background =
      this.blockedReason(line) === null
        ? 'bg-[var(--p-content-background)]'
        : 'bg-[var(--p-content-hover-background)]';

    return `${border} ${background}`;
  }

  protected categoryFor(id: Uuid): Uuid | null {
    return this.categoryByLine()[id] ?? null;
  }

  protected setCategory(id: Uuid, categoryId: Uuid | null): void {
    this.categoryByLine.update((current) => ({ ...current, [id]: categoryId }));
  }

  /** Recategorising in bulk — a sixty-line statement is mostly one or two categories. */
  protected applyCategoryToSelection(categoryId: Uuid | null): void {
    if (categoryId === null) {
      return;
    }

    this.categoryByLine.update((current) => {
      const next = { ...current };
      for (const id of this.selectedIds()) {
        next[id] = categoryId;
      }

      return next;
    });
  }

  /** Kept in its own currency: an FX line is genuinely foreign, not mislabelled. */
  protected amount(value: MinorAmount): string {
    return formatMinor(value);
  }

  /**
   * What the reviewer edits, in major units. The scale stays the parser's — relabelling the
   * currency must not rescale minor units the server owns.
   */
  protected readonly amountDrafts = linkedSignal<
    readonly StagedTransaction[],
    Record<Uuid, number>
  >({
    source: () => this.lines(),
    computation: (lines) =>
      Object.fromEntries(lines.map((line) => [line.id, minorToMajor(line.amount)])),
  });

  protected amountDraft(line: StagedTransaction): number {
    return this.amountDrafts()[line.id] ?? minorToMajor(line.amount);
  }

  protected setAmountDraft(line: StagedTransaction, value: number | null): void {
    if (value === null || Number.isNaN(value)) {
      return;
    }

    this.amountDrafts.update((current) => ({ ...current, [line.id]: value }));
  }

  protected day(iso: string): string {
    return shortDate(iso);
  }

  /** The fields the parser was least sure of, named so the reviewer knows where to look. */
  protected lowConfidenceFields(line: StagedTransaction): string {
    return Object.entries(line.fieldConfidence)
      .filter(([, value]) => value !== undefined && value < 0.8)
      .map(([field]) => this.t(`ingest.field.${field}`))
      .join(', ');
  }

  /** Opens the stored original in a new tab. */
  protected openOriginal(): void {
    this.busy.set(true);
    this.service.original(this.id()).subscribe({
      next: (blob) => {
        this.busy.set(false);

        const url = URL.createObjectURL(blob);

        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.busy.set(false);
        this.messages.add({
          severity: 'error',
          summary: this.t('ingest.originalFailed'),
          life: 5000,
        });
      },
    });
  }

  protected onDescriptionChange(line: StagedTransaction, value: string): void {
    const trimmed = value.trim();

    if (trimmed === '' || trimmed === (line.normalizedDescription ?? line.rawDescription)) {
      return;
    }

    this.service
      .editLine(this.id(), line.id, { normalizedDescription: trimmed })
      .subscribe({ error: () => undefined });
  }

  /** On blur, not on every keystroke: each commit is a PATCH. */
  protected commitAmount(line: StagedTransaction): void {
    const value = this.amountDrafts()[line.id];

    if (value === undefined || Number.isNaN(value)) {
      return;
    }

    const edited = majorToMinor(value, line.amount.currency);

    if (edited.amountMinor === line.amount.amountMinor) {
      return;
    }

    this.service.editLine(this.id(), line.id, { amount: edited }).subscribe({
      error: () => undefined,
    });
  }

  protected rejectSelection(): void {
    const ids = [...this.selectedIds()];

    if (ids.length === 0) {
      return;
    }

    this.busy.set(true);
    this.service.reject(this.id(), ids).subscribe({
      next: () => {
        this.busy.set(false);
        this.selectedIds.set(new Set());
        this.messages.add({
          severity: 'success',
          summary: this.t('ingest.rejected', { count: ids.length }),
          life: 5000,
        });
      },
      error: () => this.busy.set(false),
    });
  }

  protected confirmSelection(): void {
    const target = this.target();

    if (target === null) {
      return;
    }

    const lines: ConfirmLine[] = [...this.selectedIds()].map((id) => ({
      id,
      categoryId: this.categoryByLine()[id] as Uuid,
      bankAccountId: target.kind === 'account' ? target.id : null,
      creditCardId: target.kind === 'card' ? target.id : null,
    }));

    this.busy.set(true);
    this.service.confirm(this.id(), { lines }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.selectedIds.set(new Set());

        if (result.failed > 0) {
          this.messages.add({
            severity: 'warn',
            summary: this.t('ingest.confirmPartial', {
              filed: result.filed,
              failed: result.failed,
            }),
            detail: result.results.find((line) => line.error)?.error ?? '',
            life: 10000,
          });

          return;
        }

        this.messages.add({
          severity: 'success',
          summary: this.t('ingest.confirmed', { count: result.filed }),
          life: 6000,
        });
      },
      error: () => this.busy.set(false),
    });
  }

  protected askDelete(): void {
    this.confirmation.confirm({
      header: this.t('ingest.deleteHeader'),
      message: this.t('ingest.deleteMessage'),
      acceptLabel: this.t('ingest.deleteConfirm'),
      rejectLabel: this.t('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(),
    });
  }

  /** Back to the queue on success — the detail resource for a deleted document only 404s. */
  private delete(): void {
    this.busy.set(true);
    this.service.delete(this.id()).subscribe({
      next: () => {
        this.busy.set(false);
        this.messages.add({
          severity: 'success',
          summary: this.t('ingest.deleted'),
          life: 5000,
        });

        void this.router.navigate(['/ingest']);
      },
      error: () => this.busy.set(false),
    });
  }

  protected askRollback(): void {
    this.confirmation.confirm({
      header: this.t('ingest.rollbackHeader'),
      message: this.t('ingest.rollbackMessage', {
        count: this.document()?.filedCount ?? 0,
      }),
      acceptLabel: this.t('ingest.rollbackConfirm'),
      rejectLabel: this.t('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.rollback(),
    });
  }

  private rollback(): void {
    this.busy.set(true);
    this.service.rollback(this.id()).subscribe({
      next: (result) => {
        this.busy.set(false);

        if (result.failed > 0) {
          this.messages.add({
            severity: 'warn',
            summary: this.t('ingest.rollbackPartial', {
              undone: result.undone,
              failed: result.failed,
            }),
            life: 10000,
          });

          return;
        }

        this.messages.add({
          severity: 'success',
          summary: this.t('ingest.rolledBack', { count: result.undone }),
          life: 6000,
        });
      },
      error: () => this.busy.set(false),
    });
  }
}
