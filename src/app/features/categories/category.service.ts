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

  private readonly translateName = defaultCategoryNames();

  displayName(category: Category): string {
    return this.translateName()(category.name);
  }

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

  readonly byIdMap = computed(() => new Map(this.items().map((c) => [c.id, c])));
}
