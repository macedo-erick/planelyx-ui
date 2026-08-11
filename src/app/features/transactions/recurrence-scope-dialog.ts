import { Component, computed, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { RadioButton } from 'primeng/radiobutton';

import { injectTranslate } from '../../core/i18n/translate';
import { TransactionScope } from '../../shared/models/enums';

/** Asks how far an edit or delete should reach through an installment or recurring series. */
@Component({
  selector: 'planelyx-recurrence-scope-dialog',
  imports: [Dialog, Button, RadioButton, FormsModule],
  templateUrl: './recurrence-scope-dialog.html',
})
export class RecurrenceScopeDialog {
  readonly visible = model.required<boolean>();
  readonly mode = input<'delete' | 'save'>('delete');
  readonly installment = input(false);

  readonly confirmed = output<TransactionScope>();

  protected readonly t = injectTranslate();

  protected readonly scope = signal<TransactionScope>('SINGLE');

  protected readonly heading = computed(() =>
    this.t(
      this.mode() === 'delete'
        ? 'transactions.scope.deleteHeading'
        : 'transactions.scope.saveHeading',
    ),
  );

  protected readonly unitParams = computed(() => {
    const suffix = this.installment() ? 'Installment' : 'Occurrence';

    return {
      unit: this.t(`transactions.scope.unit${suffix}`),
      units: this.t(`transactions.scope.unit${suffix}s`),
    };
  });

  protected readonly confirmLabel = computed(() =>
    this.t(this.mode() === 'delete' ? 'common.delete' : 'common.save'),
  );

  protected readonly confirmSeverity = computed(() =>
    this.mode() === 'delete' ? 'danger' : 'primary',
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.scope.set('SINGLE');
      }
    });
  }

  protected onConfirm(): void {
    this.confirmed.emit(this.scope());
    this.visible.set(false);
  }
}
