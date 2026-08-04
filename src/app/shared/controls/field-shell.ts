import { Component, computed, input } from '@angular/core';
import type { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';

/**
 * Label + control + error chrome shared by every `planelyx-*` control.
 *
 * Centralising it here is what keeps the accessibility contract (label association,
 * `aria-describedby`, `role="alert"` on errors) correct in one place rather than in
 * every form across the app.
 */
@Component({
  selector: 'planelyx-field-shell',
  template: `
    <div class="flex flex-col gap-1.5">
      <label [attr.for]="inputId()" class="text-sm font-medium text-[var(--p-text-color)]">
        {{ label() }}
        @if (required()) {
          <span class="text-[var(--p-red-500)]" aria-hidden="true">*</span>
          <span class="sr-only">(required)</span>
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

  /** Errors stay hidden until the user has actually left the field. */
  readonly showErrors = computed(
    () => this.touched() && this.invalid() && this.messages().length > 0,
  );

  readonly hintId = computed(() => `${this.inputId()}-hint`);
  readonly errorId = computed(() => `${this.inputId()}-error`);

  /** `message` is optional on ValidationError, so fall back to the rule name. */
  readonly messages = computed(() =>
    this.errors().map((error) => error.message ?? defaultMessage(error.kind)),
  );
}

function defaultMessage(kind: string): string {
  switch (kind) {
    case 'required':
      return 'This field is required.';
    case 'min':
      return 'Value is too small.';
    case 'max':
      return 'Value is too large.';
    case 'minLength':
      return 'Too short.';
    case 'maxLength':
      return 'Too long.';
    case 'email':
      return 'Enter a valid email address.';
    case 'pattern':
      return 'Value has an unexpected format.';
    default:
      return 'This value is not valid.';
  }
}
