import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { InputNumber } from 'primeng/inputnumber';

import { FintrackControlBase, generateControlId } from './control-base';
import { FintrackFieldShell } from './field-shell';

/** Plain integer input — used for closing/due day and occurrence counts. */
@Component({
  selector: 'fintrack-number-input',
  imports: [InputNumber, FormsModule, FintrackFieldShell],
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
        [showButtons]="showButtons()"
        [useGrouping]="false"
        [min]="min()"
        [max]="max()"
        [disabled]="disabled()"
        [readonly]="readonly()"
        [placeholder]="placeholder()"
        [invalid]="invalid() && touched()"
        [ariaDescribedBy]="describedBy"
        [fluid]="true"
      />
    </fintrack-field-shell>
  `,
})
export class FintrackNumberInput
  extends FintrackControlBase
  implements FormValueControl<number | null>
{
  readonly value = model<number | null>(null);
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly showButtons = input(true);

  protected readonly inputId = generateControlId('fintrack-number');
  protected readonly describedBy = `${this.inputId}-hint ${this.inputId}-error`;

  protected onChange(next: number | null): void {
    this.value.set(next);
  }
}
