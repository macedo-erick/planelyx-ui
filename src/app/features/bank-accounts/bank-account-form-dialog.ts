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
import { form, FormField, maxLength, min, minLength, required } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { environment } from '../../../environments/environment';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { PlanelyxSelect } from '../../shared/controls/select';
import { PlanelyxTextInput } from '../../shared/controls/text-input';
import { BankAccount, BankAccountRequest } from '../../shared/models/bank-account';
import { AccountType } from '../../shared/models/enums';
import { ACCOUNT_TYPE_OPTIONS } from '../../shared/util/enum-labels';
import { BankAccountService } from './bank-account.service';
import { FormsModule } from '@angular/forms';

interface BankAccountFormModel {
  name: string;
  bankName: string;
  accountType: AccountType | null;
  initialBalance: number;
  currency: string;
}

const empty = (): BankAccountFormModel => ({
  name: '',
  bankName: '',
  accountType: 'CHECKING',
  initialBalance: 0,
  currency: environment.defaultCurrency,
});

@Component({
  selector: 'planelyx-bank-account-form-dialog',
  imports: [
    Dialog,
    Button,
    FormField,
    PlanelyxTextInput,
    PlanelyxSelect,
    PlanelyxMoneyInput,
    FormsModule,
  ],
  templateUrl: './bank-account-form-dialog.html',
})
export class BankAccountFormDialog {
  private readonly service = inject(BankAccountService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly account = input<BankAccount | null>(null);
  readonly saved = output<void>();
  readonly deleted = output<BankAccount>();

  protected readonly typeOptions = ACCOUNT_TYPE_OPTIONS;
  protected readonly defaultCurrency = environment.defaultCurrency;
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.account() !== null);

  protected readonly model = signal<BankAccountFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.name, { message: 'Give the account a name.' });
    maxLength(path.name, 255);
    required(path.bankName, { message: 'Which bank is it with?' });
    maxLength(path.bankName, 255);
    required(path.accountType, { message: 'Pick a type.' });
    required(path.currency, { message: 'Currency is required.' });
    minLength(path.currency, 3, { message: 'Use a 3-letter code, e.g. BRL.' });
    maxLength(path.currency, 3, { message: 'Use a 3-letter code, e.g. BRL.' });
    min(path.initialBalance, 0, { message: 'Initial balance cannot be negative.' });
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const current = this.account();
      this.f().reset(
        current
          ? {
              name: current.name,
              bankName: current.bankName,
              accountType: current.accountType,
              initialBalance: current.initialBalance,
              currency: current.currency,
            }
          : empty(),
      );
      this.saving.set(false);
    });
  }

  /**
   * Delete lives in here rather than on the card because the cards are click-to-edit —
   * this dialog is the only place a single account is ever the subject of an action.
   */
  protected confirmDelete(): void {
    const current = this.account();
    if (!current) {
      return;
    }

    this.confirm.confirm({
      header: 'Delete account',
      message: `Permanently delete "${current.name}"? This cannot be undone, and any cards or transactions attached to it will be affected.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service
          .remove(current.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.visible.set(false);
            this.deleted.emit(current);
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
    const request: BankAccountRequest = {
      name: value.name.trim(),
      bankName: value.bankName.trim(),
      accountType: value.accountType as AccountType,
      initialBalance: value.initialBalance,
      currency: value.currency.trim().toUpperCase(),
    };

    const existing = this.account();
    const call = existing
      ? this.service.update(existing.id, request)
      : this.service.create(request);

    this.saving.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({
          severity: 'success',
          summary: existing ? 'Account updated' : 'Account created',
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
