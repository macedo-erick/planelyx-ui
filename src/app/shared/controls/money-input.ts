import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { InputNumber } from 'primeng/inputnumber';

import { environment } from '../../../environments/environment';
import { Money } from '../models/common';
import { FintrackControlBase, generateControlId } from './control-base';
import { FintrackFieldShell } from './field-shell';
import { StyleClass } from 'primeng/styleclass';

/**
 * Currency input backed by PrimeNG's InputNumber.
 *
 * The inner control is a `ControlValueAccessor`, so it is driven with a standalone
 * `ngModel` here rather than by `[formField]` — the wrapper itself is what Signal Forms
 * binds to.
 */
@Component({
  selector: 'fintrack-money-input',
  imports: [InputNumber, FormsModule, FintrackFieldShell, StyleClass],
  template: `
    <fintrack-field-shell
      [label]="label()"
      [inputId]="inputId"
      [hint]="hint()"
      [required]="required()"
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
    >
      <p-inputnumber
        [inputId]="inputId"
        [ngModel]="value()"
        [ngModelOptions]="{ standalone: true }"
        (ngModelChange)="onChange($event)"
        (onBlur)="touch.emit()"
        mode="currency"
        [currency]="currency()"
        [locale]="locale"
        [disabled]="disabled()"
        [readonly]="readonly()"
        [min]="min()"
        [max]="max()"
        [placeholder]="placeholder()"
        [invalid]="invalid() && touched()"
        [ariaDescribedBy]="describedBy"
        pStyleClass="w-full"
      />
    </fintrack-field-shell>
  `,
})
export class FintrackMoneyInput extends FintrackControlBase implements FormValueControl<Money> {
  readonly value = model<Money>(0);
  readonly currency = input(environment.defaultCurrency);
  /** Bound automatically from `min()`/`max()` rules in the form schema. */
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);

  protected readonly locale = environment.defaultLocale;
  protected readonly inputId = generateControlId('fintrack-money');
  protected readonly describedBy = `${this.inputId}-hint ${this.inputId}-error`;

  /** InputNumber emits null when cleared; the model is non-nullable, so normalize to 0. */
  protected onChange(next: number | null): void {
    this.value.set(next ?? 0);
  }
}
