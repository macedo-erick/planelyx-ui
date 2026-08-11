import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { Select } from 'primeng/select';

import { SelectOption } from '../util/enum-labels';
import { generateControlId, PlanelyxControlBase } from './control-base';
import { PlanelyxFieldShell } from './field-shell';

@Component({
  selector: 'planelyx-select',
  imports: [Select, FormsModule, PlanelyxFieldShell],
  templateUrl: './select.html',
})
export class PlanelyxSelect<T> extends PlanelyxControlBase implements FormValueControl<T | null> {
  readonly value = model<T | null>(null);
  readonly options = input.required<SelectOption<T>[]>();
  readonly showClear = input(false);

  protected readonly inputId = generateControlId('planelyx-select');
}
