import { Component, computed, input } from '@angular/core';

import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../models/category';
import { defaultCategoryNames } from '../util/enum-labels';

/**
 * A category rendered as its coloured icon.
 *
 * In dense tables the icon stands in for the name, but the name is never actually
 * dropped: it stays as a `title` for hover and as visually-hidden text so screen readers
 * and search-in-page still find it. Set `showName` where there is room for both.
 */
@Component({
  selector: 'planelyx-category-badge',
  template: `
    <span class="inline-flex items-center gap-2" [attr.title]="name()">
      <span
        class="grid shrink-0 place-items-center rounded-full"
        [class]="sizeClasses()"
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
export class PlanelyxCategoryBadge {
  /** Undefined when the category was deleted but transactions still reference it. */
  readonly category = input<Category | undefined>(undefined);
  readonly showName = input(false);
  /** `md` is the list-row circle; `sm` is the dense inline one. */
  readonly size = input<'sm' | 'md'>('sm');

  private readonly t = injectTranslate();

  /**
   * Every category name in the app goes through this badge, which makes it the one place the
   * seeded English names have to be translated. A category the user named themselves has no
   * entry and comes through as typed.
   */
  private readonly translateName = defaultCategoryNames();

  protected readonly name = computed(() => {
    const category = this.category();
    return category
      ? this.translateName()(category.name)
      : this.t('categoryDefaults.Uncategorised');
  });
  protected readonly icon = computed(() => this.category()?.icon ?? 'pi-circle');

  protected readonly sizeClasses = computed(() =>
    this.size() === 'md' ? 'size-10 text-base' : 'size-7 text-xs',
  );

  protected readonly background = computed(
    () => this.category()?.color ?? 'var(--p-content-hover-background)',
  );

  protected readonly foreground = computed(() =>
    this.category()?.color ? '#fff' : 'var(--p-text-muted-color)',
  );
}
