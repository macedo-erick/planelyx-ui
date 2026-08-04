import { Component, input } from '@angular/core';

@Component({
  selector: 'planelyx-page-header',
  template: `
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-[var(--p-text-color)]">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-[var(--p-text-muted-color)]">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PlanelyxPageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
