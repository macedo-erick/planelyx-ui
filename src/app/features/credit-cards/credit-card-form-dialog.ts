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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, max, maxLength, min, required } from '@angular/forms/signals';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { FintrackMoneyInput } from '../../shared/controls/money-input';
import { FintrackNumberInput } from '../../shared/controls/number-input';
import { FintrackSelect } from '../../shared/controls/select';
import { FintrackTextInput } from '../../shared/controls/text-input';
import { Uuid } from '../../shared/models/common';
import { CreditCard, CreditCardRequest } from '../../shared/models/credit-card';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CreditCardService } from './credit-card.service';

interface CreditCardFormModel {
  bankAccountId: Uuid | null;
  name: string;
  brand: string;
  creditLimit: number;
  closingDay: number | null;
  dueDay: number | null;
}

const empty = (): CreditCardFormModel => ({
  bankAccountId: null,
  name: '',
  brand: '',
  creditLimit: 0,
  closingDay: 1,
  dueDay: 10,
});

@Component({
  selector: 'fintrack-credit-card-form-dialog',
  imports: [
    Dialog,
    Button,
    FormField,
    FintrackTextInput,
    FintrackSelect,
    FintrackMoneyInput,
    FintrackNumberInput,
  ],
  templateUrl: './credit-card-form-dialog.html',
})
export class CreditCardFormDialog {
  private readonly service = inject(CreditCardService);
  private readonly accounts = inject(BankAccountService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly card = input<CreditCard | null>(null);
  readonly saved = output<void>();

  protected readonly accountOptions = computed(() => this.accounts.options());
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.card() !== null);

  protected readonly model = signal<CreditCardFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.bankAccountId, { message: 'Pick the account this card belongs to.' });
    required(path.name, { message: 'Give the card a name.' });
    maxLength(path.name, 255);
    required(path.brand, { message: 'Which brand is it?' });
    maxLength(path.brand, 50);
    min(path.creditLimit, 0, { message: 'Limit cannot be negative.' });
    required(path.closingDay, { message: 'Closing day is required.' });
    min(path.closingDay, 1, { message: 'Must be between 1 and 31.' });
    max(path.closingDay, 31, { message: 'Must be between 1 and 31.' });
    required(path.dueDay, { message: 'Due day is required.' });
    min(path.dueDay, 1, { message: 'Must be between 1 and 31.' });
    max(path.dueDay, 31, { message: 'Must be between 1 and 31.' });
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
      creditLimit: value.creditLimit,
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
          summary: existing ? 'Card updated' : 'Card created',
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
