import { computed, Service } from '@angular/core';

import { CrudService } from '../../core/http/crud-service';
import { Category, CategoryRequest } from '../../shared/models/category';
import { Uuid } from '../../shared/models/common';
import { defaultCategoryNames, SelectOption } from '../../shared/util/enum-labels';

@Service()
export class CategoryService extends CrudService<Category, CategoryRequest> {
  constructor() {
    super('categories');
  }

  /**
   * The seeded categories are shared rows stored in English, so their display name is
   * resolved here rather than in each dropdown. `PlanelyxCategoryBadge` does the same for the
   * places that render a category as a badge.
   */
  private readonly translateName = defaultCategoryNames();

  displayName(category: Category): string {
    return this.translateName()(category.name);
  }

  /**
   * Alphabetical, for dropdowns and tables — the API returns no sort order. Sorted on the
   * translated name, since that is what the reader sees.
   */
  readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => this.displayName(a).localeCompare(this.displayName(b))),
  );

  readonly expenseCategories = computed(() => this.sorted().filter((c) => c.type === 'EXPENSE'));
  readonly incomeCategories = computed(() => this.sorted().filter((c) => c.type === 'INCOME'));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.sorted().map((category) => ({
      label: this.displayName(category),
      value: category.id,
      icon: category.icon ?? undefined,
    })),
  );

  /** Fast id -> category lookup for rendering names in transaction tables. */
  readonly byIdMap = computed(() => new Map(this.items().map((c) => [c.id, c])));
}
