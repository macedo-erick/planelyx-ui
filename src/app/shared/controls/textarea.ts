import { Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { Textarea } from 'primeng/textarea';

import { generateControlId, PlanelyxControlBase } from './control-base';
import { PlanelyxFieldShell } from './field-shell';

@Component({
  selector: 'planelyx-textarea',
  imports: [Textarea, PlanelyxFieldShell],
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
      <textarea
        pTextarea
        [id]="inputId"
        [rows]="rows()"
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
      ></textarea>
    </planelyx-field-shell>
  `,
})
export class PlanelyxTextarea extends PlanelyxControlBase implements FormValueControl<string> {
  readonly value = model<string>('');
  readonly rows = input(3);
  readonly maxLength = input<number | undefined>(undefined);

  protected readonly inputId = generateControlId('planelyx-textarea');
  protected readonly describedBy = `${this.inputId}-hint ${this.inputId}-error`;

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}
