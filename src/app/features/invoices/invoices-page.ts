import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { IsoDate, Uuid } from '../../shared/models/common';
import { InvoiceStatus } from '../../shared/models/enums';
import { Invoice } from '../../shared/models/invoice';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { daysUntil, fromIsoDate } from '../../shared/util/date';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_OPTIONS,
  INVOICE_STATUS_SEVERITY,
} from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { InvoiceService } from './invoice.service';

@Component({
  selector: 'fintrack-invoices-page',
  imports: [
    TableModule,
    Tag,
    Button,
    Select,
    FormsModule,
    RouterLink,
    FintrackPageHeader,
    FintrackEmptyState,
  ],
  templateUrl: './invoices-page.html',
})
export class InvoicesPage {
  protected readonly service = inject(InvoiceService);
  private readonly cards = inject(CreditCardService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly statusOptions = INVOICE_STATUS_OPTIONS;
  protected readonly cardOptions = computed(() => this.cards.options());
  protected readonly invoices = computed(() => this.service.sorted());

  protected readonly cardFilter = signal<Uuid | null>(null);
  protected readonly statusFilter = signal<InvoiceStatus | null>(null);

  protected readonly outstanding = computed(() =>
    this.service.unpaid().reduce((total, invoice) => total + invoice.totalAmount, 0),
  );

  protected onCardChange(cardId: Uuid | null): void {
    this.cardFilter.set(cardId);
    this.pushFilters();
  }

  protected onStatusChange(status: InvoiceStatus | null): void {
    this.statusFilter.set(status);
    this.pushFilters();
  }

  private pushFilters(): void {
    this.service.setFilters({
      creditCardId: this.cardFilter() ?? undefined,
      status: this.statusFilter() ?? undefined,
    });
  }

  protected cardName(id: Uuid): string {
    return this.cards.byIdMap().get(id)?.name ?? 'Card';
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

  protected dueHint(invoice: Invoice): { text: string; overdue: boolean } | null {
    if (invoice.status === 'PAID') {
      return null;
    }
    const days = daysUntil(invoice.dueDate);
    if (days === null) {
      return null;
    }
    if (days < 0) {
      return { text: `${Math.abs(days)} days overdue`, overdue: true };
    }
    if (days === 0) {
      return { text: 'Due today', overdue: true };
    }
    return days <= 7 ? { text: `in ${days} days`, overdue: false } : null;
  }

  protected confirmPay(invoice: Invoice): void {
    this.confirm.confirm({
      header: 'Mark invoice as paid',
      message: `Mark the ${this.cardName(invoice.creditCardId)} invoice of ${formatMoney(invoice.totalAmount)} as paid?`,
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: 'Mark paid' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.pay(invoice.id).subscribe();
      },
    });
  }

  protected confirmUnpay(invoice: Invoice): void {
    this.confirm.confirm({
      header: 'Undo payment',
      message: 'Reopen this invoice? Its status goes back to open and the paid date is cleared.',
      icon: 'pi pi-undo',
      acceptButtonProps: { label: 'Reopen', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.unpay(invoice.id).subscribe();
      },
    });
  }
}
