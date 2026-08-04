import { Component, computed, input } from '@angular/core';

import { Category } from '../models/category';

/**
 * A category rendered as its coloured icon.
 *
 * In dense tables the icon stands in for the name, but the name is never actually
 * dropped: it stays as a `title` for hover and as visually-hidden text so screen readers
 * and search-in-page still find it. Set `showName` where there is room for both.
 */
@Component({
  selector: 'fintrack-category-badge',
  template: `
    <span class="inline-flex items-center gap-2" [attr.title]="name()">
      <span
        class="grid size-7 shrink-0 place-items-center rounded-full text-xs"
        [style.background]="background()"
        [style.color]="foreground()"
      >
        <i class="pi {{ icon() }}" aria-hidden="true"></i>
      </span>
      @if (showName()) {
        <span class="truncate">{{ name() }}</span>
      } @else {
        <span class="sr-only">{{ name() }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-block;
      max-width: 100%;
    }
  `,
})
export class FintrackCategoryBadge {
  /** Undefined when the category was deleted but transactions still reference it. */
  readonly category = input<Category | undefined>(undefined);
  readonly showName = input(false);

  protected readonly name = computed(() => this.category()?.name ?? 'Uncategorised');
  protected readonly icon = computed(() => this.category()?.icon ?? 'pi-circle');

  protected readonly background = computed(
    () => this.category()?.color ?? 'var(--p-content-hover-background)',
  );

  protected readonly foreground = computed(() =>
    this.category()?.color ? '#fff' : 'var(--p-text-muted-color)',
  );
}
