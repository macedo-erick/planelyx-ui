import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import {
  FormField,
  applyWhen,
  form,
  hidden,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { FintrackDatePicker } from '../../shared/controls/date-picker';
import { FintrackMoneyInput } from '../../shared/controls/money-input';
import { FintrackNumberInput } from '../../shared/controls/number-input';
import { FintrackSelect } from '../../shared/controls/select';
import { FintrackTextInput } from '../../shared/controls/text-input';
import { IsoDate, Uuid } from '../../shared/models/common';
import { RecurrenceType, TransactionKind } from '../../shared/models/enums';
import {
  Transaction,
  TransactionRequest,
  TransactionUpdateRequest,
} from '../../shared/models/transaction';
import { TransactionTemplateRequest } from '../../shared/models/transaction-template';
import { todayIso } from '../../shared/util/date';
import {
  SelectOption,
  TRANSACTION_KIND_LABELS,
  TRANSACTION_KIND_OPTIONS,
} from '../../shared/util/enum-labels';
import { formatMoney, splitInstallments } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { TransactionTemplateService } from './transaction-template.service';
import { TransactionService } from './transaction.service';

/** `NONE` posts a plain transaction; anything else posts a recurring template. */
type Repeat = 'NONE' | RecurrenceType;

const REPEAT_OPTIONS: SelectOption<Repeat>[] = [
  { label: 'Does not repeat', value: 'NONE' },
  { label: 'Every month, no end date', value: 'FIXED_INDEFINITE' },
  { label: 'Every month, set number of times', value: 'FIXED_COUNT' },
  { label: 'Split into installments', value: 'INSTALLMENT' },
];

interface TransactionFormModel {
  kind: TransactionKind;
  bankAccountId: Uuid | null;
  creditCardId: Uuid | null;
  categoryId: Uuid | null;
  amount: number;
  transactionDate: IsoDate | null;
  description: string;
  repeats: Repeat;
  totalOccurrences: number | null;
}

const empty = (): TransactionFormModel => ({
  kind: 'ACCOUNT_DEBIT',
  bankAccountId: null,
  creditCardId: null,
  categoryId: null,
  amount: 0,
  transactionDate: todayIso(),
  description: '',
  repeats: 'NONE',
  totalOccurrences: null,
});

@Component({
  selector: 'fintrack-transaction-form-dialog',
  imports: [
    Dialog,
    Button,
    FormField,
    FintrackSelect,
    FintrackTextInput,
    FintrackMoneyInput,
    FintrackNumberInput,
    FintrackDatePicker,
  ],
  templateUrl: './transaction-form-dialog.html',
})
export class TransactionFormDialog {
  private readonly service = inject(TransactionService);
  private readonly templates = inject(TransactionTemplateService);
  private readonly accounts = inject(BankAccountService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly transaction = input<Transaction | null>(null);
  readonly saved = output<void>();

  protected readonly kindOptions = TRANSACTION_KIND_OPTIONS;
  protected readonly repeatOptions = REPEAT_OPTIONS;
  protected readonly accountOptions = computed(() => this.accounts.options());
  protected readonly cardOptions = computed(() => this.cards.options());
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.transaction() !== null);

  protected readonly model = signal<TransactionFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.kind);

    /*
     * The API enforces a hard XOR: CARD_CHARGE must carry a creditCardId and no
     * bankAccountId; the account kinds are the reverse. Violations are a 400. Marking the
     * irrelevant field hidden also drops it from validation, so the form can never be
     * valid in a shape the server would reject.
     */
    hidden(path.bankAccountId, { when: ({ valueOf }) => valueOf(path.kind) === 'CARD_CHARGE' });
    hidden(path.creditCardId, { when: ({ valueOf }) => valueOf(path.kind) !== 'CARD_CHARGE' });

    required(path.bankAccountId, { message: 'Pick the account.' });
    required(path.creditCardId, { message: 'Pick the card.' });

    required(path.categoryId, { message: 'Every transaction needs a category.' });
    min(path.amount, 0.01, { message: 'Amount must be greater than zero.' });
    required(path.transactionDate, { message: 'Pick a date.' });
    required(path.description, { message: 'Add a short description.' });
    maxLength(path.description, 255);

    /*
     * Occurrence rules mirror TransactionTemplateService.validateRecurrence:
     *   FIXED_INDEFINITE -> must be null   FIXED_COUNT -> >= 1   INSTALLMENT -> >= 2
     * Hidden keeps it out of both validation and the payload for the other cases.
     */
    hidden(path.totalOccurrences, {
      when: ({ valueOf }) =>
        valueOf(path.repeats) === 'NONE' || valueOf(path.repeats) === 'FIXED_INDEFINITE',
    });
    required(path.totalOccurrences, { message: 'How many times?' });

    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.repeats) === 'FIXED_COUNT',
      (p) => min(p.totalOccurrences, 1, { message: 'At least 1.' }),
    );
    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.repeats) === 'INSTALLMENT',
      (p) => min(p.totalOccurrences, 2, { message: 'Installments need at least 2.' }),
    );
  });

  protected readonly isRecurring = computed(() => this.f.repeats().value() !== 'NONE');
  protected readonly isInstallment = computed(() => this.f.repeats().value() === 'INSTALLMENT');

  protected readonly amountLabel = computed(() =>
    this.isInstallment() ? 'Total amount' : 'Amount',
  );

  protected readonly amountHint = computed(() => {
    if (this.isInstallment()) {
      return 'The full purchase price. It is split across the installments.';
    }
    return this.isRecurring() ? 'Charged every month.' : '';
  });

  protected readonly dateLabel = computed(() => (this.isRecurring() ? 'Starts on' : 'Date'));

  protected readonly occurrencesLabel = computed(() =>
    this.isInstallment() ? 'Number of installments' : 'Number of times',
  );

  /**
   * Preview of the installment amount, e.g. "12 × R$ 833,33".
   *
   * Shows the per-installment value only. The server puts any leftover cents on the last
   * installment, but surfacing that split here is noise — the number people want to see
   * is what they will be charged each month.
   */
  protected readonly previewSummary = computed(() => {
    if (!this.isInstallment()) {
      return '';
    }
    const count = this.f.totalOccurrences().value() ?? 0;
    const total = this.f.amount().value();
    if (count < 2 || total <= 0) {
      return '';
    }
    const parts = splitInstallments(total, count);
    return `${parts.length} × ${formatMoney(parts[0])}`;
  });

  /** Only income categories make sense for money coming in. */
  protected readonly categoryOptions = computed(() => {
    const kind = this.f.kind().value();
    const list =
      kind === 'ACCOUNT_CREDIT'
        ? this.categories.incomeCategories()
        : this.categories.expenseCategories();
    // Fall back to everything rather than showing an empty dropdown.
    const source = list.length > 0 ? list : this.categories.sorted();
    return source.map((category) => ({
      label: category.name,
      value: category.id,
      icon: category.icon ?? undefined,
    }));
  });

  protected readonly sourceName = computed(() => {
    const current = this.transaction();
    if (!current) {
      return '';
    }
    return current.creditCardId
      ? (this.cards.byIdMap().get(current.creditCardId)?.name ?? '—')
      : (this.accounts.byIdMap().get(current.bankAccountId ?? '')?.name ?? '—');
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const current = this.transaction();
      untracked(() => {
        this.f().reset(
          current
            ? {
                kind: current.kind,
                bankAccountId: current.bankAccountId,
                creditCardId: current.creditCardId,
                categoryId: current.categoryId,
                amount: current.amount,
                transactionDate: current.transactionDate,
                description: current.description,
                // Recurrence is fixed at creation — the API has no template update.
                repeats: 'NONE',
                totalOccurrences: null,
              }
            : empty(),
        );
        this.saving.set(false);
      });
    });

    // Installments only exist on cards, so force the kind rather than letting the API 400.
    effect(() => {
      if (this.f.repeats().value() === 'INSTALLMENT') {
        untracked(() => this.f.kind().value.set('CARD_CHARGE'));
      }
    });
  }

  protected kindLabel(kind: TransactionKind): string {
    return TRANSACTION_KIND_LABELS[kind];
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const value = this.model();
    const existing = this.transaction();
    const recurring = value.repeats !== 'NONE';

    // One of three endpoints depending on mode: update, plain create, or template create.
    // Typed as `unknown` because the three branches return different payloads and we
    // only care that the call completed.
    const call: Observable<unknown> = existing
      ? this.service.update(existing.id, {
          categoryId: value.categoryId as Uuid,
          amount: value.amount,
          transactionDate: value.transactionDate as IsoDate,
          description: value.description.trim(),
        } satisfies TransactionUpdateRequest)
      : recurring
        ? this.templates.create({
            kind: value.kind,
            bankAccountId: value.kind === 'CARD_CHARGE' ? null : value.bankAccountId,
            creditCardId: value.kind === 'CARD_CHARGE' ? value.creditCardId : null,
            categoryId: value.categoryId as Uuid,
            description: value.description.trim(),
            totalAmount: value.amount,
            recurrenceType: value.repeats as RecurrenceType,
            startDate: value.transactionDate as IsoDate,
            // Must be null for FIXED_INDEFINITE or the API rejects it.
            totalOccurrences: value.repeats === 'FIXED_INDEFINITE' ? null : value.totalOccurrences,
          } satisfies TransactionTemplateRequest)
        : this.service.create({
            kind: value.kind,
            // Send exactly one of the two, matching the server's XOR constraint.
            bankAccountId: value.kind === 'CARD_CHARGE' ? null : value.bankAccountId,
            creditCardId: value.kind === 'CARD_CHARGE' ? value.creditCardId : null,
            categoryId: value.categoryId as Uuid,
            amount: value.amount,
            transactionDate: value.transactionDate as IsoDate,
            description: value.description.trim(),
          } satisfies TransactionRequest);

    this.saving.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        // Creating a template materializes transactions server-side, so refresh the list.
        if (recurring) {
          this.service.reload();
        }
        this.messages.add({
          severity: 'success',
          summary: existing
            ? 'Transaction updated'
            : recurring
              ? 'Recurring rule created'
              : 'Transaction created',
          detail: recurring
            ? 'The transactions it generates are now in your list.'
            : value.description,
          life: recurring ? 4000 : 3000,
        });
        this.visible.set(false);
        this.saved.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
