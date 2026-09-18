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
import { form, FormField, maxLength, min, minLength, required } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { environment } from '../../../environments/environment';
import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { PlanelyxSelect } from '../../shared/controls/select';
import { PlanelyxTextInput } from '../../shared/controls/text-input';
import { InvestmentType } from '../../shared/models/enums';
import { Investment, InvestmentRequest } from '../../shared/models/investment';
import { investmentTypeOptions } from '../../shared/util/enum-labels';
import { InvestmentService } from './investment.service';

interface InvestmentFormModel {
  name: string;
  institution: string;
  investmentType: InvestmentType | null;
  initialBalance: number | null;
  currency: string;
}

const empty = (): InvestmentFormModel => ({
  name: '',
  institution: '',
  investmentType: 'FIXED_INCOME',
  initialBalance: null,
  currency: environment.defaultCurrency,
});

@Component({
  selector: 'planelyx-investment-form-dialog',
  imports: [
    Dialog,
    Button,
    FormField,
    FormsModule,
    PlanelyxTextInput,
    PlanelyxSelect,
    PlanelyxMoneyInput,
  ],
  templateUrl: './investment-form-dialog.html',
})
export class InvestmentFormDialog {
  private readonly service = inject(InvestmentService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly investment = input<Investment | null>(null);

  protected readonly t = injectTranslate();
  protected readonly typeOptions = investmentTypeOptions();
  protected readonly defaultCurrency = environment.defaultCurrency;
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.investment() !== null);

  protected readonly model = signal<InvestmentFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.name, { message: this.t('validation.investmentName') });
    maxLength(path.name, 255);
    required(path.institution, { message: this.t('validation.institution') });
    maxLength(path.institution, 255);
    required(path.investmentType, { message: this.t('validation.investmentType') });
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
      const current = this.investment();
      this.f().reset(
        current
          ? {
              name: current.name,
              institution: current.institution,
              investmentType: current.investmentType,
              initialBalance: current.initialBalance,
              currency: current.currency,
            }
          : empty(),
      );
      this.saving.set(false);
    });
  }

  protected confirmDelete(): void {
    const current = this.investment();
    if (!current) {
      return;
    }

    this.confirm.confirm({
      header: this.t('investments.deleteHeader'),
      message: this.t('investments.deleteMessage', { name: current.name }),
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
            },
            error: () => this.saving.set(false),
          });
      },
    });
  }

  /** An edit never moves `initialBalance`, though the API still requires it. */
  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const value = this.model();
    const existing = this.investment();
    const request: InvestmentRequest = {
      name: value.name.trim(),
      institution: value.institution.trim(),
      investmentType: value.investmentType as InvestmentType,
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
          summary: this.t(existing ? 'investments.updated' : 'investments.created'),
          detail: request.name,
          life: 3000,
        });
        this.visible.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
