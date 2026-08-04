import { Component, computed, model } from '@angular/core';
import { Button } from 'primeng/button';

import { startOfMonth } from '../util/date';

/** `‹ Jun 2025 ›` — steps the bound date one calendar month at a time. */
@Component({
  selector: 'fintrack-month-nav',
  imports: [Button],
  template: `
    <div
      class="flex items-center justify-between gap-2 rounded-xl border border-[var(--p-content-border-color)] bg-[var(--p-content-background)] px-2 py-1.5 shadow-sm"
    >
      <p-button
        icon="pi pi-chevron-left"
        severity="secondary"
        [text]="true"
        [rounded]="true"
        ariaLabel="Previous month"
        (onClick)="step(-1)"
      />
      <span class="font-semibold text-[var(--p-text-color)]" aria-live="polite">{{ label() }}</span>
      <p-button
        icon="pi pi-chevron-right"
        severity="secondary"
        [text]="true"
        [rounded]="true"
        ariaLabel="Next month"
        (onClick)="step(1)"
      />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class FintrackMonthNav {
  /** Always normalised to the first of the month so equality checks stay simple. */
  readonly month = model.required<Date>();

  protected readonly label = computed(() =>
    this.month().toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
  );

  protected step(offset: number): void {
    const current = this.month();
    this.month.set(startOfMonth(new Date(current.getFullYear(), current.getMonth() + offset, 1)));
  }
}
