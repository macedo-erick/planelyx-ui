import { Component, input } from '@angular/core';

/** The white panel every list and summary now sits on. */
@Component({
  selector: 'planelyx-card',
  template: `
    <div
      class="h-full overflow-hidden rounded-xl border border-[var(--p-content-border-color)] bg-[var(--p-content-background)] shadow-sm"
      [class.p-4]="padded()"
    >
      <ng-content select="[card-header]" />
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PlanelyxCard {
  readonly padded = input(false);
}
