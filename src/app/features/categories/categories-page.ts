import { Component, computed, inject, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { FintrackCategoryBadge } from '../../shared/ui/category-badge';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { Category } from '../../shared/models/category';
import { CategoryType } from '../../shared/models/enums';
import { CATEGORY_TYPE_LABELS } from '../../shared/util/enum-labels';
import { CategoryFormDialog } from './category-form-dialog';
import { CategoryService } from './category.service';
import { StyleClass } from 'primeng/styleclass';

@Component({
  selector: 'fintrack-categories-page',
  imports: [
    TableModule,
    Tag,
    Button,
    FintrackPageHeader,
    FintrackEmptyState,
    FintrackCategoryBadge,
    CategoryFormDialog,
    StyleClass,
  ],
  templateUrl: './categories-page.html',
})
export class CategoriesPage {
  protected readonly service = inject(CategoryService);
  private readonly confirm = inject(ConfirmationService);

  protected dialogOpen = signal(false);
  protected readonly selected = signal<Category | null>(null);

  protected readonly categories = computed(() => this.service.sorted());

  /** PrimeNG row templates are untyped, so narrow here rather than indexing in the template. */
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

  protected confirmDelete(category: Category): void {
    this.confirm.confirm({
      header: 'Delete category',
      message: `Delete "${category.name}"? Transactions using it will be left without a valid category.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.remove(category.id).subscribe();
      },
    });
  }
}
