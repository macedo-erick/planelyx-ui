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
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, required } from '@angular/forms/signals';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxMoneyInput } from '../../shared/controls/money-input';
import { Money } from '../../shared/models/common';
import { Invoice } from '../../shared/models/invoice';
import { formatMoneyUnmasked, roundCents } from '../../shared/util/money';
import { InvoiceService } from './invoice.service';

interface AdjustInvoiceFormModel {
  /** Nullable because the money input can be cleared; seeded with the current total on open. */
  targetAmount: Money | null;
}

/**
 * Corrects an invoice to the total on the statement the card issuer sent.
 *
 * The total is the sum of the invoice's charges, so nothing here overwrites it — the
 * difference is recorded as a charge of its own. That leaves the discrepancy visible among the
 * charges rather than silently absorbed, which is what the note in the dialog warns about.
 */
@Component({
  selector: 'planelyx-adjust-invoice-dialog',
  imports: [Dialog, Button, FormField, FormsModule, PlanelyxMoneyInput],
  templateUrl: './adjust-invoice-dialog.html',
})
export class AdjustInvoiceDialog {
  private readonly service = inject(InvoiceService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly invoice = input<Invoice | null>(null);

  /** The charge lists are separate resources; the pages holding them refetch on this. */
  readonly adjusted = output<void>();

  protected readonly t = injectTranslate();
  protected readonly saving = signal(false);

  protected readonly current = computed<Money>(() => this.invoice()?.totalAmount ?? 0);

  protected readonly model = signal<AdjustInvoiceFormModel>({ targetAmount: null });

  protected readonly f = form(this.model, (path) => {
    required(path.targetAmount, { message: this.t('validation.amountPositive') });
  });

  /** Signed: positive is a charge to add, negative is one to take back off. */
  protected readonly delta = computed(() =>
    roundCents((this.f.targetAmount().value() ?? this.current()) - this.current()),
  );

  protected readonly unchanged = computed(() => this.delta() === 0);

  protected readonly deltaLabel = computed(() => {
    const delta = this.delta();
    const sign = delta > 0 ? '+' : '−';
    return `${sign} ${formatMoneyUnmasked(Math.abs(delta))}`;
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.f().reset({ targetAmount: this.current() });
      this.saving.set(false);
    });
  }

  protected currentLabel(): string {
    return formatMoneyUnmasked(this.current());
  }

  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const invoice = this.invoice();
    if (!invoice || this.unchanged()) {
      this.visible.set(false);
      return;
    }

    const target = this.model().targetAmount as Money;

    this.confirm.confirm({
      header: this.t('invoices.adjust.header'),
      message: this.t('invoices.adjust.confirm', {
        target: formatMoneyUnmasked(target),
        delta: this.deltaLabel(),
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: this.t('common.adjust') },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.saving.set(true);
        this.service
          .adjust(invoice.id, target, this.t('invoices.adjust.description'))
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.saving.set(false);
              this.messages.add({
                severity: 'success',
                summary: this.t('invoices.adjust.done'),
                detail: this.t('invoices.adjust.doneDetail', {
                  target: formatMoneyUnmasked(target),
                }),
                life: 3000,
              });
              this.visible.set(false);
              this.adjusted.emit();
            },
            error: () => this.saving.set(false),
          });
      },
    });
  }
}
