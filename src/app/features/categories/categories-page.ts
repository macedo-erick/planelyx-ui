import { Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { FintrackCard } from '../../shared/ui/card';
import { FintrackCategoryBadge } from '../../shared/ui/category-badge';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { Category } from '../../shared/models/category';
import { CategoryType } from '../../shared/models/enums';
import { CATEGORY_TYPE_LABELS } from '../../shared/util/enum-labels';
import { CategoryFormDialog } from './category-form-dialog';
import { CategoryService } from './category.service';

@Component({
  selector: 'fintrack-categories-page',
  imports: [
    Tag,
    Button,
    FintrackCard,
    FintrackPageHeader,
    FintrackEmptyState,
    FintrackCategoryBadge,
    CategoryFormDialog,
  ],
  templateUrl: './categories-page.html',
})
export class CategoriesPage {
  protected readonly service = inject(CategoryService);

  protected dialogOpen = signal(false);
  protected readonly selected = signal<Category | null>(null);

  protected readonly categories = computed(() => this.service.sorted());

  protected typeLabel(type: CategoryType): string {
    return CATEGORY_TYPE_LABELS[type];
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.selected.set(category);
    this.dialogOpen.set(true);
  }
}
