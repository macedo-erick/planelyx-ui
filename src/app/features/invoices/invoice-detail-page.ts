import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { InvoiceStatus } from '../../shared/models/enums';
import { InvoiceDetail } from '../../shared/models/invoice';
import { FintrackCategoryBadge } from '../../shared/ui/category-badge';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { fromIsoDate } from '../../shared/util/date';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_SEVERITY } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { InvoiceService } from './invoice.service';

@Component({
  selector: 'fintrack-invoice-detail-page',
  imports: [
    FintrackCategoryBadge,
    TableModule,
    Tag,
    Button,
    RouterLink,
    FintrackPageHeader,
    FintrackEmptyState,
  ],
  templateUrl: './invoice-detail-page.html',
})
export class InvoiceDetailPage {
  /** Bound from the route via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);
  private readonly invoices = inject(InvoiceService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly resource = httpResource<InvoiceDetail>(
    () => `${environment.apiUrl}/invoices/${this.id()}`,
  );

  protected readonly invoice = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly charges = computed(() => [...(this.invoice()?.transactions ?? [])]);

  protected readonly heading = computed(() => {
    const inv = this.invoice();
    return inv ? `${this.cardName(inv.creditCardId)} invoice` : 'Invoice';
  });

  protected readonly periodText = computed(() => {
    const inv = this.invoice();
    return inv
      ? `Billing period ${this.shortDate(inv.billingPeriodStart)} – ${this.shortDate(inv.billingPeriodEnd)}`
      : '';
  });

  protected cardName(id: Uuid): string {
    return this.cards.byIdMap().get(id)?.name ?? 'Card';
  }

  protected category(id: Uuid): Category | undefined {
    return this.categories.byIdMap().get(id);
  }

  protected statusLabel(status: InvoiceStatus): string {
    return INVOICE_STATUS_LABELS[status];
  }

  protected statusSeverity(status: InvoiceStatus): 'success' | 'warn' | 'info' {
    return INVOICE_STATUS_SEVERITY[status];
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected shortDate(iso: IsoDate): string {
    const date = fromIsoDate(iso);
    return date ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : iso;
  }

  protected longDate(iso: IsoDate): string {
    const date = fromIsoDate(iso);
    return date ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : iso;
  }

  protected instant(value: string): string {
    return new Date(value).toLocaleString();
  }

  protected confirmPay(inv: InvoiceDetail): void {
    this.confirm.confirm({
      header: 'Mark invoice as paid',
      message: `Mark this invoice of ${formatMoney(inv.totalAmount)} as paid?`,
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: 'Mark paid' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        // Status is derived server-side, so refetch rather than patching locally.
        this.invoices.pay(inv.id).subscribe(() => this.resource.reload());
      },
    });
  }

  protected confirmUnpay(inv: InvoiceDetail): void {
    this.confirm.confirm({
      header: 'Undo payment',
      message: 'Reopen this invoice? Its status goes back to open and the paid date is cleared.',
      icon: 'pi pi-undo',
      acceptButtonProps: { label: 'Reopen', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.invoices.unpay(inv.id).subscribe(() => this.resource.reload());
      },
    });
  }
}
