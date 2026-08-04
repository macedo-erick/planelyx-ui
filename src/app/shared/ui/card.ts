import { Component, input } from '@angular/core';

/**
 * The white panel every list and summary now sits on.
 *
 * Replaces the `rounded-lg border …` string that was being copy-pasted around the feature
 * templates. Content projects into two slots: anything marked `card-header` goes above
 * everything else, so a header can keep its own padding while the body stays flush.
 */
@Component({
  selector: 'planelyx-card',
  template: `
    <div
      class="overflow-hidden rounded-xl border border-[var(--p-content-border-color)] bg-[var(--p-content-background)] shadow-sm"
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
  /**
   * Off by default: a list of rows draws its own edge-to-edge separators and must not be
   * inset. Turn it on for cards holding plain content.
   */
  readonly padded = input(false);
}
