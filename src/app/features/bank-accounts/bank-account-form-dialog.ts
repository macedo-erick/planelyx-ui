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
import { injectTranslate } from '../../core/i18n/translate';
import { BankAccount, BankAccountRequest } from '../../shared/models/bank-account';
import { AccountType } from '../../shared/models/enums';
import { accountTypeOptions } from '../../shared/util/enum-labels';
import { AdjustBalanceDialog } from './adjust-balance-dialog';
import { BankAccountService } from './bank-account.service';
import { FormsModule } from '@angular/forms';

interface BankAccountFormModel {
  name: string;
  bankName: string;
  accountType: AccountType | null;
  /** Empty means "no opening balance", so it is sent as zero rather than being required. */
  initialBalance: number | null;
  currency: string;
}

const empty = (): BankAccountFormModel => ({
  name: '',
  bankName: '',
  accountType: 'CHECKING',
  initialBalance: null,
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
    AdjustBalanceDialog,
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

  protected readonly t = injectTranslate();
  protected readonly typeOptions = accountTypeOptions();
  protected readonly defaultCurrency = environment.defaultCurrency;
  protected readonly saving = signal(false);
  protected readonly adjustOpen = signal(false);
  protected readonly editing = computed(() => this.account() !== null);

  protected readonly model = signal<BankAccountFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.name, { message: this.t('validation.accountName') });
    maxLength(path.name, 255);
    required(path.bankName, { message: this.t('validation.bankName') });
    maxLength(path.bankName, 255);
    required(path.accountType, { message: this.t('validation.accountType') });
    required(path.currency, { message: this.t('validation.currency') });
    minLength(path.currency, 3, { message: this.t('validation.currencyCode') });
    maxLength(path.currency, 3, { message: this.t('validation.currencyCode') });
    min(path.initialBalance, 0, { message: this.t('validation.balanceNegative') });
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
   * Hands off to the adjustment dialog, closing this one so the two are never stacked.
   *
   * The account stays selected on the page, so the adjustment dialog still has it.
   */
  protected openAdjust(): void {
    this.visible.set(false);
    this.adjustOpen.set(true);
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
      header: this.t('accounts.deleteHeader'),
      message: this.t('accounts.deleteMessage', { name: current.name }),
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
            error: () => this.saving.set(false),
          });
      },
    });
  }

  /**
   * An edit never moves `initialBalance`, though the API still requires it: the live balance is
   * derived from that figure, and correcting one is what "Adjust balance" is for.
   */
  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const value = this.model();
    const existing = this.account();
    const request: BankAccountRequest = {
      name: value.name.trim(),
      bankName: value.bankName.trim(),
      accountType: value.accountType as AccountType,
      initialBalance: existing ? existing.initialBalance : (value.initialBalance ?? 0),
      currency: value.currency.trim().toUpperCase(),
    };

    const call = existing
      ? this.service.update(existing.id, request)
      : this.service.create(request);

    this.saving.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({
          severity: 'success',
          summary: this.t(existing ? 'accounts.updated' : 'accounts.created'),
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
