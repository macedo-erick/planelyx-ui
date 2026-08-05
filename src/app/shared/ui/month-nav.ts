import { Component, computed, model } from '@angular/core';
import { Button } from 'primeng/button';

import { injectTranslate } from '../../core/i18n/translate';
import { startOfMonth } from '../util/date';
import { monthYear } from '../util/date-format';

/** `‹ Jun 2025 ›` — steps the bound date one calendar month at a time. */
@Component({
  selector: 'planelyx-month-nav',
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
        [ariaLabel]="t('common.previousMonth')"
        (onClick)="step(-1)"
      />
      <span class="font-semibold text-[var(--p-text-color)]" aria-live="polite">{{ label() }}</span>
      <p-button
        icon="pi pi-chevron-right"
        severity="secondary"
        [text]="true"
        [rounded]="true"
        [ariaLabel]="t('common.nextMonth')"
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
export class PlanelyxMonthNav {
  /** Always normalised to the first of the month so equality checks stay simple. */
  readonly month = model.required<Date>();

  protected readonly t = injectTranslate();

  protected readonly label = computed(() => monthYear(this.month(), 'short'));

  protected step(offset: number): void {
    const current = this.month();
    this.month.set(startOfMonth(new Date(current.getFullYear(), current.getMonth() + offset, 1)));
  }
}
