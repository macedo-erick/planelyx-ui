import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxSelect } from '../../shared/controls/select';
import { PlanelyxTextInput } from '../../shared/controls/text-input';
import { Category, CategoryRequest } from '../../shared/models/category';
import { CategoryType } from '../../shared/models/enums';
import { categoryTypeOptions, SelectOption } from '../../shared/util/enum-labels';
import { categoryIconOptions } from './category-icons';
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
  selector: 'planelyx-category-form-dialog',
  imports: [Dialog, Button, FormField, PlanelyxTextInput, PlanelyxSelect, FormsModule],
  templateUrl: './category-form-dialog.html',
})
export class CategoryFormDialog {
  private readonly service = inject(CategoryService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly category = input<Category | null>(null);
  readonly saved = output<void>();
  readonly deleted = output<Category>();

  protected readonly t = injectTranslate();
  protected readonly typeOptions = categoryTypeOptions();
  private readonly curatedIcons = categoryIconOptions();

  protected readonly iconOptions = computed<SelectOption<string>[]>(() => {
    const options = this.curatedIcons();
    const current = this.category()?.icon;

    if (!current || options.some((option) => option.value === current)) {
      return options;
    }
    return [...options, { label: this.t('categories.currentIcon'), value: current, icon: current }];
  });
  protected readonly saving = signal(false);
  protected readonly editing = computed(() => this.category() !== null);

  protected readonly model = signal<CategoryFormModel>({ ...EMPTY });

  protected readonly f = form(this.model, (path) => {
    required(path.name, { message: this.t('validation.categoryName') });
    maxLength(path.name, 255, { message: this.t('validation.nameLength') });
    required(path.type, { message: this.t('validation.categoryType') });
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

  /** Delete lives in here rather than on the card because the cards are click-to-edit. */
  protected confirmDelete(): void {
    const current = this.category();
    if (!current) {
      return;
    }

    this.confirm.confirm({
      header: this.t('categories.deleteHeader'),
      message: this.t('categories.deleteMessage', { name: current.name }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: this.t('common.delete'), severity: 'danger' },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.service
          .remove(current.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.visible.set(false);
            this.deleted.emit(current);
          });
      },
    });
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
          summary: this.t(existing ? 'categories.updated' : 'categories.created'),
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
