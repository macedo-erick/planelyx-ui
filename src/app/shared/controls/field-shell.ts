import { Component, computed, input } from '@angular/core';
import type { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';

import { injectTranslate } from '../../core/i18n/translate';

/** Label + control + error chrome shared by every `planelyx-*` control. */
@Component({
  selector: 'planelyx-field-shell',
  template: `
    <div class="flex flex-col gap-1.5">
      <label [attr.for]="inputId()" class="text-sm font-medium text-[var(--p-text-color)]">
        {{ label() }}
        @if (required()) {
          <span class="text-[var(--p-red-500)]" aria-hidden="true">*</span>
          <span class="sr-only">{{ t('validation.requiredMark') }}</span>
        }
      </label>

      <ng-content />

      @if (hint() && !showErrors()) {
        <small [id]="hintId()" class="text-[var(--p-text-muted-color)]">{{ hint() }}</small>
      }

      @if (showErrors()) {
        <div [id]="errorId()" role="alert" class="flex flex-col gap-0.5">
          @for (message of messages(); track message) {
            <small class="text-[var(--p-red-500)]">{{ message }}</small>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PlanelyxFieldShell {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly hint = input<string>('');
  readonly required = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);

  readonly showErrors = computed(
    () => this.touched() && this.invalid() && this.messages().length > 0,
  );

  readonly hintId = computed(() => `${this.inputId()}-hint`);
  readonly errorId = computed(() => `${this.inputId()}-error`);

  protected readonly t = injectTranslate();

  readonly messages = computed(() =>
    this.errors().map((error) => error.message ?? this.t(defaultMessageKey(error.kind))),
  );
}

function defaultMessageKey(kind: string): string {
  switch (kind) {
    case 'required':
      return 'validation.required';
    case 'min':
      return 'validation.min';
    case 'max':
      return 'validation.max';
    case 'minLength':
      return 'validation.minLength';
    case 'maxLength':
      return 'validation.maxLength';
    case 'email':
      return 'validation.email';
    case 'pattern':
      return 'validation.pattern';
    default:
      return 'validation.invalid';
  }
}
