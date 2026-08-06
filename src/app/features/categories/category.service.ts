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
   * The categories a user may pick or manage — every list, dropdown and the categories page
   * reads this rather than `items()`.
   *
   * System categories are left out: they exist only to label the corrections the app posts
   * itself, so offering one invites a write the API will refuse. They stay in `items()`, and
   * so in `byIdMap`, because an existing correction still has to render its category name.
   *
   * Sorted on the *translated* name. The API sorts on the stored English one, which is not
   * what a reader of another language sees.
   */
  readonly selectable = computed(() =>
    [...this.items()]
      .filter((category) => !category.system)
      .sort((a, b) => this.displayName(a).localeCompare(this.displayName(b))),
  );

  readonly expenseCategories = computed(() =>
    this.selectable().filter((c) => c.type === 'EXPENSE'),
  );
  readonly incomeCategories = computed(() => this.selectable().filter((c) => c.type === 'INCOME'));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.selectable().map((category) => ({
      label: this.displayName(category),
      value: category.id,
      icon: category.icon ?? undefined,
    })),
  );

  /** Fast id -> category lookup for rendering names in transaction tables. */
  readonly byIdMap = computed(() => new Map(this.items().map((c) => [c.id, c])));
}
