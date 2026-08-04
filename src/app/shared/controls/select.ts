import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { Select } from 'primeng/select';

import { SelectOption } from '../util/enum-labels';
import { FintrackControlBase, generateControlId } from './control-base';
import { FintrackFieldShell } from './field-shell';

@Component({
  selector: 'fintrack-select',
  imports: [Select, FormsModule, FintrackFieldShell],
  templateUrl: './select.html',
})
export class FintrackSelect<T> extends FintrackControlBase implements FormValueControl<T | null> {
  readonly value = model<T | null>(null);
  /** Mutable array type on purpose — PrimeNG's `options` input is not readonly. */
  readonly options = input.required<SelectOption<T>[]>();
  readonly showClear = input(false);

  protected readonly inputId = generateControlId('fintrack-select');
}
