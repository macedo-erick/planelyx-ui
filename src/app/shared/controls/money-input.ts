import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { InputNumber } from 'primeng/inputnumber';

import { environment } from '../../../environments/environment';
import { Money } from '../models/common';
import { currentLocale } from '../util/locale';
import { formatMoney } from '../util/money';
import { generateControlId, PlanelyxControlBase } from './control-base';
import { PlanelyxFieldShell } from './field-shell';

/**
 * Currency input backed by PrimeNG's InputNumber.
 *
 * The inner control is a `ControlValueAccessor`, so it is driven with a standalone
 * `ngModel` here rather than by `[formField]` — the wrapper itself is what Signal Forms
 * binds to.
 */
@Component({
  selector: 'planelyx-money-input',
  imports: [InputNumber, FormsModule, PlanelyxFieldShell],
  template: `
    <planelyx-field-shell
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
  /**
   * Nullable, and empty by default.
   *
   * A field seeded with `0` renders as `R$ 0,00`, which has to be selected and deleted before
   * any amount can be typed. Empty is the honest starting state; the schema is what decides
   * whether a value is required.
   */
  readonly value = model<Money | null>(null);
  readonly currency = input(environment.defaultCurrency);
  /**
   * Bound automatically from `min()`/`max()` rules in the form schema, and deliberately not
   * forwarded to InputNumber: it clamps the value to `min` on blur and on `Home`, which turns
   * a `min` of 0.01 into a field that refuses to stay empty. Validation stays in the schema.
   */
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);

  /** Drives the thousands and decimal separators, so it follows the language switch. */
  protected readonly locale = currentLocale;
  protected readonly inputId = generateControlId('planelyx-money');
  protected readonly describedBy = `${this.inputId}-hint ${this.inputId}-error`;

  /** A zero in the caller's locale, so an empty field still reads as a money field. */
  protected readonly resolvedPlaceholder = computed(
    () => this.placeholder() || formatMoney(0, this.currency()),
  );

  protected onChange(next: number | null): void {
    this.value.set(next);
  }
}
