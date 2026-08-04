import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { FintrackSelect } from '../../shared/controls/select';
import { FintrackTextInput } from '../../shared/controls/text-input';
import { Category, CategoryRequest } from '../../shared/models/category';
import { CategoryType } from '../../shared/models/enums';
import { CATEGORY_TYPE_OPTIONS } from '../../shared/util/enum-labels';
import { CATEGORY_ICON_OPTIONS } from './category-icons';
import { CategoryService } from './category.service';
import { FormsModule } from '@angular/forms';

interface CategoryFormModel {
  name: string;
  type: CategoryType | null;
  icon: string | null;
  color: string | null;
}

const EMPTY: CategoryFormModel = { name: '', type: 'EXPENSE', icon: null, color: null };

@Component({
  selector: 'fintrack-category-form-dialog',
  imports: [Dialog, Button, FormField, FintrackTextInput, FintrackSelect, FormsModule],
  templateUrl: './category-form-dialog.html',
})
export class CategoryFormDialog {
  private readonly service = inject(CategoryService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  /** Null means "create"; a category means "edit". */
  readonly category = input<Category | null>(null);
  readonly saved = output<void>();

  protected readonly typeOptions = CATEGORY_TYPE_OPTIONS;
  protected readonly iconOptions = CATEGORY_ICON_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.category() !== null);

  protected readonly model = signal<CategoryFormModel>({ ...EMPTY });

  protected readonly f = form(this.model, (path) => {
    required(path.name, { message: 'Give the category a name.' });
    maxLength(path.name, 255, { message: 'Keep the name under 255 characters.' });
    required(path.type, { message: 'Pick a type.' });
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const current = this.category();
      this.f().reset(
        current
          ? { name: current.name, type: current.type, icon: current.icon, color: current.color }
          : { ...EMPTY },
      );
      this.saving.set(false);
    });
  }

  protected onColorInput(event: Event): void {
    this.f.color().value.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const value = this.model();
    const request: CategoryRequest = {
      name: value.name.trim(),
      type: value.type as CategoryType,
      icon: value.icon,
      color: value.color,
    };

    const existing = this.category();
    const call = existing
      ? this.service.update(existing.id, request)
      : this.service.create(request);

    this.saving.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({
          severity: 'success',
          summary: existing ? 'Category updated' : 'Category created',
          detail: request.name,
          life: 3000,
        });
        this.visible.set(false);
        this.saved.emit();
      },

      error: () => this.saving.set(false),
    });
  }
}
