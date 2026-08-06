import { Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxCategoryBadge } from '../../shared/ui/category-badge';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { Category } from '../../shared/models/category';
import { CategoryType } from '../../shared/models/enums';
import { categoryTypeLabels } from '../../shared/util/enum-labels';
import { CategoryFormDialog } from './category-form-dialog';
import { CategoryService } from './category.service';

@Component({
  selector: 'planelyx-categories-page',
  imports: [
    Tag,
    Button,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
    PlanelyxCategoryBadge,
    CategoryFormDialog,
  ],
  templateUrl: './categories-page.html',
})
export class CategoriesPage {
  protected readonly service = inject(CategoryService);
  protected readonly t = injectTranslate();
  private readonly typeLabels = categoryTypeLabels();

  protected dialogOpen = signal(false);
  protected readonly selected = signal<Category | null>(null);

  protected readonly categories = computed(() => this.service.selectable());

  protected typeLabel(type: CategoryType): string {
    return this.typeLabels()[type];
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
