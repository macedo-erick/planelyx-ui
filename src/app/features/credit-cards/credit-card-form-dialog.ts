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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, max, maxLength, min, required } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { PlanelyxNumberInput } from '../../shared/controls/number-input';
import { PlanelyxSelect } from '../../shared/controls/select';
import { PlanelyxTextInput } from '../../shared/controls/text-input';
import { Uuid } from '../../shared/models/common';
import { CreditCard, CreditCardRequest } from '../../shared/models/credit-card';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CreditCardService } from './credit-card.service';
import { FormsModule } from '@angular/forms';

interface CreditCardFormModel {
  bankAccountId: Uuid | null;
  name: string;
  brand: string;
  /** Empty means "no limit tracked", so it is sent as zero rather than being required. */
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
}

const empty = (): CreditCardFormModel => ({
  bankAccountId: null,
  name: '',
  brand: '',
  creditLimit: null,
  closingDay: 1,
  dueDay: 10,
});

@Component({
  selector: 'planelyx-credit-card-form-dialog',
  imports: [
    Dialog,
    Button,
    FormField,
    PlanelyxTextInput,
    PlanelyxSelect,
    PlanelyxMoneyInput,
    PlanelyxNumberInput,
    FormsModule,
  ],
  templateUrl: './credit-card-form-dialog.html',
})
export class CreditCardFormDialog {
  private readonly service = inject(CreditCardService);
  private readonly accounts = inject(BankAccountService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly card = input<CreditCard | null>(null);
  readonly saved = output<void>();
  readonly deleted = output<CreditCard>();

  protected readonly accountOptions = computed(() => this.accounts.options());
  protected readonly t = injectTranslate();
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.card() !== null);

  protected readonly model = signal<CreditCardFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.bankAccountId, { message: this.t('validation.cardAccount') });
    required(path.name, { message: this.t('validation.cardName') });
    maxLength(path.name, 255);
    required(path.brand, { message: this.t('validation.cardBrand') });
    maxLength(path.brand, 50);
    min(path.creditLimit, 0, { message: this.t('validation.limitNegative') });
    required(path.closingDay, { message: this.t('validation.closingDay') });
    min(path.closingDay, 1, { message: this.t('validation.dayRange') });
    max(path.closingDay, 31, { message: this.t('validation.dayRange') });
    required(path.dueDay, { message: this.t('validation.dueDay') });
    min(path.dueDay, 1, { message: this.t('validation.dayRange') });
    max(path.dueDay, 31, { message: this.t('validation.dayRange') });
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const current = this.card();
      this.f().reset(
        current
          ? {
              bankAccountId: current.bankAccountId,
              name: current.name,
              brand: current.brand,
              creditLimit: current.creditLimit,
              closingDay: current.closingDay,
              dueDay: current.dueDay,
            }
          : empty(),
      );
      this.saving.set(false);
    });
  }

  /**
   * Delete lives in here rather than on the card because the cards are click-to-edit —
   * this dialog is the only place a single card is ever the subject of an action.
   */
  protected confirmDelete(): void {
    const current = this.card();
    if (!current) {
      return;
    }

    this.confirm.confirm({
      header: this.t('cards.deleteHeader'),
      message: this.t('cards.deleteMessage', { name: current.name }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: this.t('common.delete'), severity: 'danger' },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.saving.set(true);
        this.service
          .remove(current.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.saving.set(false);
              this.visible.set(false);
              this.deleted.emit(current);
            },
            // The interceptor raises the toast; the dialog stays open on purpose. Closing it
            // would suggest the card had gone when it is still there.
            error: () => this.saving.set(false),
          });
      },
    });
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const value = this.model();
    const request: CreditCardRequest = {
      bankAccountId: value.bankAccountId as Uuid,
      name: value.name.trim(),
      brand: value.brand.trim(),
      creditLimit: value.creditLimit ?? 0,
      closingDay: value.closingDay as number,
      dueDay: value.dueDay as number,
    };

    const existing = this.card();
    const call = existing
      ? this.service.update(existing.id, request)
      : this.service.create(request);

    this.saving.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({
          severity: 'success',
          summary: this.t(existing ? 'cards.updated' : 'cards.created'),
          detail: request.name,
          life: 3000,
        });
        this.visible.set(false);
        this.saved.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
