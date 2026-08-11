import { Component, computed, input } from '@angular/core';

import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../models/category';
import { defaultCategoryNames } from '../util/enum-labels';

/** A category rendered as its coloured icon. */
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
  readonly category = input<Category | undefined>(undefined);
  readonly showName = input(false);
  readonly size = input<'sm' | 'md'>('sm');

  private readonly t = injectTranslate();

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
