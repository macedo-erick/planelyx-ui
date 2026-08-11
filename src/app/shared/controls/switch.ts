import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { ToggleSwitch } from 'primeng/toggleswitch';

import { generateControlId, PlanelyxControlBase } from './control-base';

/** Boolean toggle. */
@Component({
  selector: 'planelyx-switch',
  imports: [ToggleSwitch, FormsModule],
  template: `
    <div class="flex items-center gap-3">
      <p-toggleswitch
        [inputId]="inputId"
        [ngModel]="checked()"
        [ngModelOptions]="{ standalone: true }"
        (ngModelChange)="checked.set($event)"
        (onBlur)="touch.emit()"
        [disabled]="disabled()"
      />
      <label [attr.for]="inputId" class="text-sm font-medium text-[var(--p-text-color)]">
        {{ label() }}
      </label>
    </div>
    @if (hint()) {
      <small class="mt-1 block text-[var(--p-text-muted-color)]">{{ hint() }}</small>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PlanelyxSwitch extends PlanelyxControlBase implements FormCheckboxControl {
  readonly checked = model<boolean>(false);

  protected readonly inputId = generateControlId('planelyx-switch');
}
