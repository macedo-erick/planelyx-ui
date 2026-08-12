import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of, switchMap } from 'rxjs';
import {
  applyWhen,
  form,
  FormField,
  hidden,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';

import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxDatePicker } from '../../shared/controls/date-picker';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { PlanelyxNumberInput } from '../../shared/controls/number-input';
import { PlanelyxSelect } from '../../shared/controls/select';
import { PlanelyxTextInput } from '../../shared/controls/text-input';
import { IsoDate, Money, Uuid } from '../../shared/models/common';
import { RecurrenceType, TransactionKind, TransactionScope } from '../../shared/models/enums';
import {
  Transaction,
  TransactionRequest,
  TransactionUpdateRequest,
} from '../../shared/models/transaction';
import { TransactionTemplateRequest } from '../../shared/models/transaction-template';
import { todayIso } from '../../shared/util/date';
import {
  SelectOption,
  transactionKindLabels,
  transactionKindOptions,
} from '../../shared/util/enum-labels';
import { formatMoneyUnmasked, splitInstallments } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CurrencyService } from '../bank-accounts/currency.service';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { RecurrenceScopeDialog } from './recurrence-scope-dialog';
import { TransactionTemplateService } from './transaction-template.service';
import { TransactionService } from './transaction.service';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../invoices/invoice.service';

/** `NONE` posts a plain transaction; anything else posts a recurring template. */
type Repeat = 'NONE' | RecurrenceType;

/** Keys, resolved per language where the options are built. */
const REPEAT_OPTIONS: readonly { readonly key: string; readonly value: Repeat }[] = [
  { key: 'transactions.repeatNone', value: 'NONE' },
  { key: 'transactions.repeatIndefinite', value: 'FIXED_INDEFINITE' },
  { key: 'transactions.repeatCount', value: 'FIXED_COUNT' },
  { key: 'transactions.repeatInstallment', value: 'INSTALLMENT' },
];

export interface TransactionFormModel {
  kind: TransactionKind;
  bankAccountId: Uuid | null;
  creditCardId: Uuid | null;
  categoryId: Uuid | null;
  amount: number | null;
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
  amount: null,
  transactionDate: todayIso(),
  description: '',
  repeats: 'NONE',
  totalOccurrences: null,
});

@Component({
  selector: 'planelyx-transaction-form-dialog',
  imports: [
    Dialog,
    Button,
    Checkbox,
    FormField,
    PlanelyxSelect,
    PlanelyxTextInput,
    PlanelyxMoneyInput,
    PlanelyxNumberInput,
    PlanelyxDatePicker,
    FormsModule,
    RecurrenceScopeDialog,
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
  private readonly confirm = inject(ConfirmationService);
  private readonly invoice = inject(InvoiceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencies = inject(CurrencyService);

  readonly visible = model.required<boolean>();
  readonly transaction = input<Transaction | null>(null);
  readonly prefill = input<Partial<TransactionFormModel> | null>(null);
  readonly saved = output<void>();
  readonly deleted = output<Transaction>();

  protected readonly t = injectTranslate();
  private readonly kindLabels = transactionKindLabels();
  protected readonly kindOptions = transactionKindOptions();
  protected readonly repeatOptions = computed<SelectOption<Repeat>[]>(() =>
    REPEAT_OPTIONS.map(({ key, value }) => ({ label: this.t(key), value })),
  );
  protected readonly accountOptions = computed(() => this.accounts.options());
  protected readonly cardOptions = computed(() => this.cards.options());
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.transaction() !== null);

  protected readonly paid = signal(true);

  private readonly paidTouched = signal(false);

  protected readonly paidVisible = computed(
    () => this.f.kind().value() === 'ACCOUNT_DEBIT' && !this.isRecurring(),
  );

  protected readonly scopeOpen = signal(false);
  protected readonly scopeMode = signal<'delete' | 'save'>('delete');

  protected readonly isSeries = computed(() => this.transaction()?.templateId != null);

  protected readonly isInstallmentSeries = computed(
    () => this.transaction()?.installmentNumber != null,
  );

  protected readonly model = signal<TransactionFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.kind);

    hidden(path.bankAccountId, { when: ({ valueOf }) => valueOf(path.kind) === 'CARD_CHARGE' });
    hidden(path.creditCardId, { when: ({ valueOf }) => valueOf(path.kind) !== 'CARD_CHARGE' });

    required(path.bankAccountId, { message: this.t('validation.transactionAccount') });
    required(path.creditCardId, { message: this.t('validation.transactionCard') });

    required(path.categoryId, { message: this.t('validation.transactionCategory') });
    required(path.amount, { message: this.t('validation.amountPositive') });
    min(path.amount, 0.01, { message: this.t('validation.amountPositive') });
    required(path.transactionDate, { message: this.t('validation.dateRequired') });
    required(path.description, { message: this.t('validation.descriptionRequired') });
    maxLength(path.description, 255);

    hidden(path.totalOccurrences, {
      when: ({ valueOf }) =>
        valueOf(path.repeats) === 'NONE' || valueOf(path.repeats) === 'FIXED_INDEFINITE',
    });
    required(path.totalOccurrences, { message: this.t('validation.occurrenceCount') });

    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.repeats) === 'FIXED_COUNT',
      (p) => min(p.totalOccurrences, 1, { message: this.t('validation.occurrenceMin') }),
    );
    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.repeats) === 'INSTALLMENT',
      (p) => min(p.totalOccurrences, 2, { message: this.t('validation.installmentMin') }),
    );
  });

  protected readonly isRecurring = computed(() => this.f.repeats().value() !== 'NONE');
  protected readonly isInstallment = computed(() => this.f.repeats().value() === 'INSTALLMENT');

  protected readonly amountLabel = computed(() =>
    this.t(this.isInstallment() ? 'transactions.totalAmount' : 'common.amount'),
  );

  protected readonly amountHint = computed(() => {
    if (this.isInstallment()) {
      return this.t('transactions.installmentAmountHint');
    }
    return this.isRecurring() ? this.t('transactions.recurringAmountHint') : '';
  });

  protected readonly dateLabel = computed(() =>
    this.t(this.isRecurring() ? 'transactions.startsOn' : 'common.date'),
  );

  protected readonly occurrencesLabel = computed(() =>
    this.t(
      this.isInstallment()
        ? 'transactions.occurrencesInstallments'
        : 'transactions.occurrencesTimes',
    ),
  );

  /** Follows the account or card currently picked in the form. */
  protected readonly currency = computed(() =>
    this.currencies.forSource({
      bankAccountId: this.f.bankAccountId().value(),
      creditCardId: this.f.creditCardId().value(),
    }),
  );

  protected readonly previewSummary = computed(() => {
    if (!this.isInstallment()) {
      return '';
    }
    const count = this.f.totalOccurrences().value() ?? 0;
    const total = this.f.amount().value();
    if (count < 2 || total === null || total <= 0) {
      return '';
    }
    const parts = splitInstallments(total, count);
    return `${parts.length} × ${formatMoneyUnmasked(parts[0], this.currency())}`;
  });

  protected readonly categoryOptions = computed(() => {
    const kind = this.f.kind().value();
    const list =
      kind === 'ACCOUNT_CREDIT'
        ? this.categories.incomeCategories()
        : this.categories.expenseCategories();

    const source = list.length > 0 ? list : this.categories.selectable();
    return source.map((category) => ({
      label: this.categories.displayName(category),
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

                repeats: 'NONE',
                totalOccurrences: null,
              }
            : { ...empty(), ...(this.prefill() ?? {}) },
        );
        this.paid.set(current?.paid ?? true);
        this.paidTouched.set(false);
        this.saving.set(false);
      });
    });

    effect(() => {
      if (this.f.repeats().value() === 'INSTALLMENT') {
        untracked(() => this.f.kind().value.set('CARD_CHARGE'));
      }
    });

    effect(() => {
      const date = this.f.transactionDate().value();
      if (this.editing() || this.paidTouched()) {
        return;
      }
      untracked(() => this.paid.set(!date || date <= todayIso()));
    });
  }

  protected onPaidChange(paid: boolean): void {
    this.paid.set(paid);
    this.paidTouched.set(true);
  }

  protected kindLabel(kind: TransactionKind): string {
    return this.kindLabels()[kind];
  }

  /** Delete lives in here rather than on the row because the rows are click-to-edit. */
  protected confirmDelete(): void {
    const current = this.transaction();
    if (!current) {
      return;
    }

    if (this.isSeries()) {
      this.scopeMode.set('delete');
      this.scopeOpen.set(true);
      return;
    }

    this.confirm.confirm({
      header: this.t('transactions.deleteHeader'),
      message: this.t('transactions.deleteMessage', { description: current.description }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: this.t('common.delete'), severity: 'danger' },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => this.performDelete('SINGLE'),
    });
  }

  /** Routes the answer from the scope dialog to whichever action opened it. */
  protected onScopeConfirmed(scope: TransactionScope): void {
    if (this.scopeMode() === 'delete') {
      this.performDelete(scope);
      return;
    }
    this.performSave(scope);
  }

  private performDelete(scope: TransactionScope): void {
    const current = this.transaction();
    if (!current) {
      return;
    }

    this.service
      .remove(current.id, scope)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.visible.set(false);
        this.deleted.emit(current);
        this.invoice.reload();
        this.cards.reload();
      });
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    if (this.isSeries()) {
      this.scopeMode.set('save');
      this.scopeOpen.set(true);
      return;
    }

    this.performSave('SINGLE');
  }

  /** Sends the tick, if it moved. Nothing to send otherwise. */
  private applyPaid(existing: Transaction): Observable<unknown> {
    if (!this.paidVisible() || this.paid() === existing.paid) {
      return of(null);
    }

    return this.service.setPaid(existing.id, this.paid());
  }

  private performSave(scope: TransactionScope): void {
    const value = this.model();
    const existing = this.transaction();
    const recurring = value.repeats !== 'NONE';
    const amount = value.amount as Money;

    const call: Observable<unknown> = existing
      ? this.service
          .update(existing.id, {
            categoryId: value.categoryId as Uuid,
            amount,
            transactionDate: value.transactionDate as IsoDate,
            description: value.description.trim(),
            scope,
          } satisfies TransactionUpdateRequest)
          .pipe(switchMap(() => this.applyPaid(existing)))
      : recurring
        ? this.templates.create({
            kind: value.kind,
            bankAccountId: value.kind === 'CARD_CHARGE' ? null : value.bankAccountId,
            creditCardId: value.kind === 'CARD_CHARGE' ? value.creditCardId : null,
            categoryId: value.categoryId as Uuid,
            description: value.description.trim(),
            totalAmount: amount,
            recurrenceType: value.repeats as RecurrenceType,
            startDate: value.transactionDate as IsoDate,

            totalOccurrences: value.repeats === 'FIXED_INDEFINITE' ? null : value.totalOccurrences,
          } satisfies TransactionTemplateRequest)
        : this.service.create({
            kind: value.kind,

            bankAccountId: value.kind === 'CARD_CHARGE' ? null : value.bankAccountId,
            creditCardId: value.kind === 'CARD_CHARGE' ? value.creditCardId : null,
            categoryId: value.categoryId as Uuid,
            amount,
            transactionDate: value.transactionDate as IsoDate,
            description: value.description.trim(),
            paid: this.paidVisible() ? this.paid() : undefined,
          } satisfies TransactionRequest);

    this.saving.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);

        if (recurring) {
          this.service.reload();
        }
        this.messages.add({
          severity: 'success',
          summary: existing
            ? this.t('transactions.updated')
            : this.t(recurring ? 'transactions.ruleCreated' : 'transactions.created'),
          detail: recurring ? this.t('transactions.ruleCreatedDetail') : value.description,
          life: recurring ? 4000 : 3000,
        });
        this.visible.set(false);
        this.saved.emit();
        this.invoice.reload();
        this.cards.reload();
      },
      error: () => this.saving.set(false),
    });
  }
}
