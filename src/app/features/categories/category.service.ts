import { Service, computed } from '@angular/core';

import { CrudService } from '../../core/http/crud-service';
import { Category, CategoryRequest } from '../../shared/models/category';
import { Uuid } from '../../shared/models/common';
import { SelectOption } from '../../shared/util/enum-labels';

@Service()
export class CategoryService extends CrudService<Category, CategoryRequest> {
  constructor() {
    super('categories');
  }

  /** Alphabetical, for dropdowns and tables — the API returns no sort order. */
  readonly sorted = computed(() => [...this.items()].sort((a, b) => a.name.localeCompare(b.name)));

  readonly expenseCategories = computed(() => this.sorted().filter((c) => c.type === 'EXPENSE'));
  readonly incomeCategories = computed(() => this.sorted().filter((c) => c.type === 'INCOME'));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.sorted().map((category) => ({
      label: category.name,
      value: category.id,
      icon: category.icon ?? undefined,
    })),
  );

  /** Fast id -> category lookup for rendering names in transaction tables. */
  readonly byIdMap = computed(() => new Map(this.items().map((c) => [c.id, c])));
}
