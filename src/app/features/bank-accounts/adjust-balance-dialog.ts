import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, required } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxDatePicker } from '../../shared/controls/date-picker';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { BankAccount } from '../../shared/models/bank-account';
import { IsoDate, Money } from '../../shared/models/common';
import { todayIso } from '../../shared/util/date';
import { formatMoney, roundCents } from '../../shared/util/money';
import { BankAccountService } from './bank-account.service';

interface AdjustBalanceFormModel {
  /** Nullable because the money input can be cleared; seeded with the current balance on open. */
  targetBalance: Money | null;
  transactionDate: IsoDate | null;
}

/**
 * Corrects an account to the balance the owner reads off their bank.
 *
 * A balance is derived from transactions rather than stored, so there is nothing here to
 * overwrite. The difference is posted as an ordinary transaction, which is why this is a
 * separate action from editing the account instead of a field on that form — it writes to the
 * ledger, and the dialog says so before it does.
 */
@Component({
  selector: 'planelyx-adjust-balance-dialog',
  imports: [Dialog, Button, FormField, FormsModule, PlanelyxMoneyInput, PlanelyxDatePicker],
  templateUrl: './adjust-balance-dialog.html',
})
export class AdjustBalanceDialog {
  private readonly service = inject(BankAccountService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly account = input<BankAccount | null>(null);

  protected readonly t = injectTranslate();
  protected readonly saving = signal(false);

  protected readonly currency = computed(
    () => this.account()?.currency ?? this.service.items()[0]?.currency ?? 'BRL',
  );

  /** What the account is worth today, before any correction. */
  protected readonly current = computed<Money>(() => {
    const account = this.account();
    return account ? (this.service.balanceFor(account.id) ?? account.initialBalance) : 0;
  });

  protected readonly model = signal<AdjustBalanceFormModel>({
    targetBalance: null,
    transactionDate: todayIso(),
  });

  protected readonly f = form(this.model, (path) => {
    required(path.targetBalance, { message: this.t('validation.amountPositive') });
    required(path.transactionDate, { message: this.t('validation.adjustmentDate') });
  });

  /** Signed: positive is money the ledger is missing, negative is money it over-counted. */
  protected readonly delta = computed(() =>
    roundCents((this.f.targetBalance().value() ?? this.current()) - this.current()),
  );

  protected readonly unchanged = computed(() => this.delta() === 0);

  protected readonly deltaLabel = computed(() => {
    const delta = this.delta();
    const sign = delta > 0 ? '+' : '−';
    return `${sign} ${formatMoney(Math.abs(delta), this.currency())}`;
  });

  constructor() {
    // Seeded from the current balance so the field opens on the number it is replacing, and
    // submitting untouched is a no-op rather than a correction to zero.
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.f().reset({ targetBalance: this.current(), transactionDate: todayIso() });
      this.saving.set(false);
    });
  }

  protected currentLabel(): string {
    return formatMoney(this.current(), this.currency());
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const account = this.account();
    if (!account || this.unchanged()) {
      this.visible.set(false);
      return;
    }

    const value = this.model();
    // `unchanged()` already returned above for a cleared field, and the schema requires one.
    const target = value.targetBalance as Money;

    this.confirm.confirm({
      header: this.t('accounts.adjust.header'),
      message: this.t('accounts.adjust.confirm', {
        name: account.name,
        target: formatMoney(target, this.currency()),
        delta: this.deltaLabel(),
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: this.t('common.adjust') },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.saving.set(true);
        this.service
          .adjustBalance(account.id, {
            targetBalance: target,
            transactionDate: value.transactionDate,
            // The API has no translations, so the transaction is named from here or it reads
            // English.
            description: this.t('accounts.adjust.description'),
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.saving.set(false);
              this.messages.add({
                severity: 'success',
                summary: this.t('accounts.adjust.done'),
                detail: this.t('accounts.adjust.doneDetail', {
                  name: account.name,
                  target: formatMoney(target, this.currency()),
                }),
                life: 3000,
              });
              this.visible.set(false);
            },
            error: () => this.saving.set(false),
          });
      },
    });
  }
}
