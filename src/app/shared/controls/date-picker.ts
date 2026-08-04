import { Component, linkedSignal, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { DatePicker } from 'primeng/datepicker';

import { environment } from '../../../environments/environment';
import { IsoDate } from '../models/common';
import { fromIsoDate, toIsoDate } from '../util/date';
import { FintrackControlBase, generateControlId } from './control-base';
import { FintrackFieldShell } from './field-shell';
import { StyleClass } from 'primeng/styleclass';

/**
 * Date input whose model value is the API's `LocalDate` string, not a `Date`.
 *
 * The `Date` the picker needs is derived with `linkedSignal` (the documented
 * value-transformation pattern) and both directions go through `shared/util/date.ts`,
 * which works in local date parts — so the selected day never shifts by a timezone offset.
 */
@Component({
  selector: 'fintrack-date-picker',
  imports: [DatePicker, FormsModule, FintrackFieldShell, StyleClass],
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
      <p-datepicker
        [inputId]="inputId"
        [ngModel]="displayValue()"
        [ngModelOptions]="{ standalone: true }"
        (ngModelChange)="onChange($event)"
        (onBlur)="touch.emit()"
        [disabled]="disabled()"
        [readonlyInput]="readonly()"
        [placeholder]="placeholder()"
        [invalid]="invalid() && touched()"
        [showIcon]="true"
        [showButtonBar]="true"
        dateFormat="dd/mm/yy"
        appendTo="body"
        pStyleClass="w-full"
      />
    </fintrack-field-shell>
  `,
})
export class FintrackDatePicker
  extends FintrackControlBase
  implements FormValueControl<IsoDate | null>
{
  readonly value = model<IsoDate | null>(null);

  protected readonly locale = environment.defaultLocale;
  protected readonly inputId = generateControlId('fintrack-date');

  /** Follows `value()` but is what the picker actually binds to. */
  protected readonly displayValue = linkedSignal(() => fromIsoDate(this.value()));

  protected onChange(next: Date | null): void {
    this.value.set(next ? toIsoDate(next) : null);
  }
}
