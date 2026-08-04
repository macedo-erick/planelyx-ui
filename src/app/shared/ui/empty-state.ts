import { Component, input } from '@angular/core';

@Component({
  selector: 'fintrack-empty-state',
  template: `
    <div class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <i
        [class]="'pi ' + icon()"
        class="text-3xl text-[var(--p-text-muted-color)]"
        aria-hidden="true"
      ></i>
      <p class="font-medium text-[var(--p-text-color)]">{{ title() }}</p>
      @if (message()) {
        <p class="max-w-sm text-sm text-[var(--p-text-muted-color)]">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class FintrackEmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly icon = input('pi-inbox');
}
