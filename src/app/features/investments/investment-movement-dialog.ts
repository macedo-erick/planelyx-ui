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
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { environment } from '../../../environments/environment';
import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxDatePicker } from '../../shared/controls/date-picker';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { PlanelyxSelect } from '../../shared/controls/select';
import { PlanelyxTextInput } from '../../shared/controls/text-input';
import { IsoDate, Money, Uuid } from '../../shared/models/common';
import { Investment } from '../../shared/models/investment';
import { todayIso } from '../../shared/util/date';
import { SelectOption } from '../../shared/util/enum-labels';
import { formatMoneyUnmasked, roundCents } from '../../shared/util/money';
import { qualifiedLabel } from '../../shared/util/option-label';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { InvestmentService } from './investment.service';

/** The two directions differ by a label, an endpoint and a guard. */
export type MovementDirection = 'CONTRIBUTE' | 'REDEEM';

interface MovementFormModel {
  bankAccountId: Uuid | null;
  amount: Money | null;
  transactionDate: IsoDate | null;
  description: string;
}

@Component({
  selector: 'planelyx-investment-movement-dialog',
  imports: [
    Dialog,
    Button,
    FormField,
    FormsModule,
    PlanelyxSelect,
    PlanelyxMoneyInput,
    PlanelyxDatePicker,
    PlanelyxTextInput,
  ],
  templateUrl: './investment-movement-dialog.html',
})
export class InvestmentMovementDialog {
  private readonly service = inject(InvestmentService);
  private readonly accounts = inject(BankAccountService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly investment = input<Investment | null>(null);
  readonly direction = input<MovementDirection>('CONTRIBUTE');

  protected readonly t = injectTranslate();
  protected readonly saving = signal(false);
  protected readonly contributing = computed(() => this.direction() === 'CONTRIBUTE');

  protected readonly currency = computed(
    () => this.investment()?.currency ?? environment.defaultCurrency,
  );

  /** Only accounts in the investment's currency — there are no rates anywhere in this app. */
  protected readonly accountOptions = computed<SelectOption<Uuid>[]>(() =>
    this.accounts
      .selectable()
      .filter((account) => account.currency === this.currency())
      .map((account) => ({
        label: qualifiedLabel(account.name, account.bankName),
        value: account.id,
      })),
  );

  protected readonly noEligibleAccounts = computed(() => this.accountOptions().length === 0);

  protected readonly model = signal<MovementFormModel>({
    bankAccountId: null,
    amount: null,
    transactionDate: todayIso(),
    description: '',
  });

  protected readonly f = form(this.model, (path) => {
    required(path.bankAccountId, { message: this.t('validation.account') });
    required(path.amount, { message: this.t('validation.amountPositive') });
    required(path.transactionDate, { message: this.t('validation.transactionDate') });
  });

  protected readonly investmentBalance = computed(() => {
    const investment = this.investment();
    return investment ? (this.service.balanceFor(investment.id) ?? investment.initialBalance) : 0;
  });

  protected readonly accountBalance = computed(() => {
    const id = this.f.bankAccountId().value();
    return id ? (this.accounts.balanceFor(id) ?? 0) : 0;
  });

  protected readonly amount = computed(() => roundCents(this.f.amount().value() ?? 0));

  protected readonly accountAfter = computed(() =>
    roundCents(this.accountBalance() + (this.contributing() ? -this.amount() : this.amount())),
  );

  protected readonly investmentAfter = computed(() =>
    roundCents(this.investmentBalance() + (this.contributing() ? this.amount() : -this.amount())),
  );

  /** The API refuses this too; saying so here saves the round trip. */
  protected readonly overdrawn = computed(
    () => !this.contributing() && this.amount() > this.investmentBalance(),
  );

  protected readonly selectedAccountLabel = computed(() => {
    const id = this.f.bankAccountId().value();
    const account = id ? this.accounts.byIdMap().get(id) : undefined;

    return account ? qualifiedLabel(account.name, account.bankName) : '';
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.f().reset({
        bankAccountId: this.accountOptions()[0]?.value ?? null,
        amount: null,
        transactionDate: todayIso(),
        description: '',
      });
      this.saving.set(false);
    });
  }

  protected money(value: Money): string {
    return formatMoneyUnmasked(value, this.currency());
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid() || this.overdrawn()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const investment = this.investment();
    if (!investment) {
      return;
    }

    const value = this.model();
    const request = {
      bankAccountId: value.bankAccountId as Uuid,
      amount: value.amount as Money,
      transactionDate: value.transactionDate,
      description: value.description.trim() || undefined,
    };

    const call = this.contributing()
      ? this.service.contribute(investment.id, request)
      : this.service.redeem(investment.id, request);

    this.saving.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.accounts.reloadBalances();
        this.messages.add({
          severity: 'success',
          summary: this.t(
            this.contributing() ? 'investments.contributed_done' : 'investments.redeemed_done',
          ),
          detail: this.t('investments.movementDetail', {
            amount: this.money(request.amount),
            name: investment.name,
          }),
          life: 3000,
        });
        this.visible.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
