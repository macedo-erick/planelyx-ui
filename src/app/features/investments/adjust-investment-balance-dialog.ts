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
import { IsoDate, Money } from '../../shared/models/common';
import { Investment } from '../../shared/models/investment';
import { todayIso } from '../../shared/util/date';
import { formatMoneyUnmasked, roundCents } from '../../shared/util/money';
import { InvestmentService } from './investment.service';

interface AdjustFormModel {
  targetBalance: Money | null;
  transactionDate: IsoDate | null;
}

/**
 * Records what the investment is now worth, posting the difference as yield or a loss. The only
 * place a return is recognised, which is why the dialog says so.
 */
@Component({
  selector: 'planelyx-adjust-investment-balance-dialog',
  imports: [Dialog, Button, FormField, FormsModule, PlanelyxMoneyInput, PlanelyxDatePicker],
  templateUrl: './adjust-investment-balance-dialog.html',
})
export class AdjustInvestmentBalanceDialog {
  private readonly service = inject(InvestmentService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly investment = input<Investment | null>(null);

  protected readonly t = injectTranslate();
  protected readonly saving = signal(false);

  protected readonly currency = computed(
    () => this.investment()?.currency ?? environment.defaultCurrency,
  );

  protected readonly current = computed<Money>(() => {
    const investment = this.investment();
    return investment ? (this.service.balanceFor(investment.id) ?? investment.initialBalance) : 0;
  });

  protected readonly model = signal<AdjustFormModel>({
    targetBalance: null,
    transactionDate: todayIso(),
  });

  protected readonly f = form(this.model, (path) => {
    required(path.targetBalance, { message: this.t('validation.amountPositive') });
    required(path.transactionDate, { message: this.t('validation.adjustmentDate') });
  });

  protected readonly delta = computed(() =>
    roundCents((this.f.targetBalance().value() ?? this.current()) - this.current()),
  );

  protected readonly unchanged = computed(() => this.delta() === 0);

  protected readonly gain = computed(() => this.delta() > 0);

  protected readonly deltaLabel = computed(
    () =>
      `${this.gain() ? '+' : '−'} ${formatMoneyUnmasked(Math.abs(this.delta()), this.currency())}`,
  );

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.f().reset({ targetBalance: this.current(), transactionDate: todayIso() });
      this.saving.set(false);
    });
  }

  protected currentLabel(): string {
    return formatMoneyUnmasked(this.current(), this.currency());
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const investment = this.investment();
    if (!investment || this.unchanged()) {
      this.visible.set(false);
      return;
    }

    const value = this.model();
    const target = value.targetBalance as Money;

    this.saving.set(true);
    this.service
      .adjustBalance(investment.id, {
        targetBalance: target,
        transactionDate: value.transactionDate,
        description: this.t('investments.adjust.description'),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.messages.add({
            severity: 'success',
            summary: this.t('investments.adjust.done'),
            detail: this.t('investments.adjust.doneDetail', {
              name: investment.name,
              target: formatMoneyUnmasked(target, this.currency()),
            }),
            life: 3000,
          });
          this.visible.set(false);
        },
        error: () => this.saving.set(false),
      });
  }
}
