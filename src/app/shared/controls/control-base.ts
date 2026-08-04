import { Directive, input, output } from '@angular/core';
import type {
  DisabledReason,
  ValidationError,
  WithOptionalFieldTree,
} from '@angular/forms/signals';

let nextControlId = 0;

/** Unique DOM id so labels and `aria-describedby` can point at the right element. */
export function generateControlId(prefix: string): string {
  nextControlId += 1;
  return `${prefix}-${nextControlId}`;
}

/**
 * The optional half of the `FormUiControl` contract, shared by every wrapper.
 *
 * The `FormField` directive discovers these by name and keeps them in sync with the bound
 * field, so declaring them here means each wrapper only has to declare its `value`.
 */
@Directive()
export abstract class PlanelyxControlBase {
  readonly label = input.required<string>();
  readonly hint = input<string>('');
  readonly placeholder = input<string>('');

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly touched = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);

  /**
   * Must be emitted on blur (not focus) or the field never registers as touched and
   * errors stay invisible.
   */
  readonly touch = output<void>();
}
