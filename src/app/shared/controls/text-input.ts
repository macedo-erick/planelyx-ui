import { Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { InputText } from 'primeng/inputtext';

import { generateControlId, PlanelyxControlBase } from './control-base';
import { PlanelyxFieldShell } from './field-shell';

@Component({
  selector: 'planelyx-text-input',
  imports: [InputText, PlanelyxFieldShell],
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
      <input
        pInputText
        [id]="inputId"
        [type]="type()"
        [value]="value()"
        [disabled]="disabled()"
        [readOnly]="readonly()"
        [placeholder]="placeholder()"
        [attr.maxlength]="maxLength() ?? null"
        [attr.aria-invalid]="invalid() && touched()"
        [attr.aria-required]="required()"
        [attr.aria-describedby]="describedBy"
        (input)="onInput($event)"
        (blur)="touch.emit()"
        class="w-full"
      />
    </planelyx-field-shell>
  `,
})
export class PlanelyxTextInput extends PlanelyxControlBase implements FormValueControl<string> {
  readonly value = model<string>('');
  readonly type = input<'text' | 'email' | 'search'>('text');
  readonly maxLength = input<number | undefined>(undefined);

  protected readonly inputId = generateControlId('planelyx-text');
  protected readonly describedBy = `${this.inputId}-hint ${this.inputId}-error`;

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
