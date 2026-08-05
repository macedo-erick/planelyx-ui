import { Component, computed, linkedSignal, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { DatePicker } from 'primeng/datepicker';

import { IsoDate } from '../models/common';
import { fromIsoDate, toIsoDate } from '../util/date';
import { datePickerFormat } from '../util/date-format';
import { generateControlId, PlanelyxControlBase } from './control-base';
import { PlanelyxFieldShell } from './field-shell';

/**
 * Date input whose model value is the API's `LocalDate` string, not a `Date`.
 *
 * The `Date` the picker needs is derived with `linkedSignal` (the documented
 * value-transformation pattern) and both directions go through `shared/util/date.ts`,
 * which works in local date parts — so the selected day never shifts by a timezone offset.
 */
@Component({
  selector: 'planelyx-date-picker',
  imports: [DatePicker, FormsModule, PlanelyxFieldShell],
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
        [dateFormat]="dateFormat()"
        appendTo="body"
        [fluid]="true"
      />
    </planelyx-field-shell>
  `,
})
export class PlanelyxDatePicker
  extends PlanelyxControlBase
  implements FormValueControl<IsoDate | null>
{
  readonly value = model<IsoDate | null>(null);

  /** `dd/mm/yy` or `mm/dd/yy` depending on the language — PrimeNG's own token syntax. */
  protected readonly dateFormat = computed(() => datePickerFormat());
  protected readonly inputId = generateControlId('planelyx-date');

  /** Follows `value()` but is what the picker actually binds to. */
  protected readonly displayValue = linkedSignal(() => fromIsoDate(this.value()));

  protected onChange(next: Date | null): void {
    this.value.set(next ? toIsoDate(next) : null);
  }
}
