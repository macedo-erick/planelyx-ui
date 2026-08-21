import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { InputNumber } from 'primeng/inputnumber';

import { environment } from '../../../environments/environment';
import { Money } from '../models/common';
import { currentLocale } from '../util/locale';
import { formatMoneyUnmasked } from '../util/money';
import { generateControlId, PlanelyxControlBase } from './control-base';
import { PlanelyxFieldShell } from './field-shell';

/** Currency input backed by PrimeNG's InputNumber. */
@Component({
  selector: 'planelyx-money-input',
  imports: [InputNumber, FormsModule, PlanelyxFieldShell],
  template: `
    <planelyx-field-shell
      [label]="label()"
      [hideLabel]="hideLabel()"
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
        [locale]="locale()"
        [disabled]="disabled()"
        [readonly]="readonly()"
        [allowEmpty]="true"
        [placeholder]="resolvedPlaceholder()"
        [invalid]="invalid() && touched()"
        [ariaDescribedBy]="describedBy"
        [fluid]="true"
      />
    </planelyx-field-shell>
  `,
})
export class PlanelyxMoneyInput
  extends PlanelyxControlBase
  implements FormValueControl<Money | null>
{
  readonly value = model<Money | null>(null);
  readonly currency = input(environment.defaultCurrency);
  /** For a row in a list, where a visible label per line would be noise. */
  readonly hideLabel = input(false);
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);

  protected readonly locale = currentLocale;
  protected readonly inputId = generateControlId('planelyx-money');
  protected readonly describedBy = `${this.inputId}-hint ${this.inputId}-error`;

  protected readonly resolvedPlaceholder = computed(
    () => this.placeholder() || formatMoneyUnmasked(0, this.currency()),
  );

  protected onChange(next: number | null): void {
    this.value.set(next);
  }
}
