import { Component, computed, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { RadioButton } from 'primeng/radiobutton';

import { TransactionScope } from '../../shared/models/enums';

/**
 * Asks how far an edit or delete should reach through an installment or recurring series.
 *
 * A plain confirm cannot express this — `ConfirmationService` only models accept and reject,
 * and there are three answers here.
 */
@Component({
  selector: 'fintrack-recurrence-scope-dialog',
  imports: [Dialog, Button, RadioButton, FormsModule],
  templateUrl: './recurrence-scope-dialog.html',
})
export class RecurrenceScopeDialog {
  readonly visible = model.required<boolean>();
  /** Changes the wording and the severity of the confirm button; the choices are the same. */
  readonly mode = input<'delete' | 'save'>('delete');
  /** Installments read as "installments"; open-ended rules read as "occurrences". */
  readonly installment = input(false);

  readonly confirmed = output<TransactionScope>();

  protected readonly scope = signal<TransactionScope>('SINGLE');

  protected readonly heading = computed(() =>
    this.mode() === 'delete' ? 'Delete from the series' : 'Save to the series',
  );

  protected readonly unit = computed(() => (this.installment() ? 'installment' : 'occurrence'));

  protected readonly confirmLabel = computed(() => (this.mode() === 'delete' ? 'Delete' : 'Save'));

  protected readonly confirmSeverity = computed(() =>
    this.mode() === 'delete' ? 'danger' : 'primary',
  );

  constructor() {
    // Reopening must not inherit the previous answer — "all" is destructive enough that it
    // should never be preselected by accident.
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
