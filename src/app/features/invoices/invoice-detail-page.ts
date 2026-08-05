import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { InvoiceStatus } from '../../shared/models/enums';
import { Invoice } from '../../shared/models/invoice';
import { emptyPage, PageResponse } from '../../shared/models/page';
import { Transaction } from '../../shared/models/transaction';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { PlanelyxTransactionRow } from '../../shared/ui/transaction-row';
import { dateTime, longDate, shortDate } from '../../shared/util/date-format';
import { INVOICE_STATUS_SEVERITY, invoiceStatusLabels } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { AdjustInvoiceDialog } from './adjust-invoice-dialog';
import { InvoiceService } from './invoice.service';

@Component({
  selector: 'planelyx-invoice-detail-page',
  imports: [
    Tag,
    Button,
    Paginator,
    RouterLink,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
    PlanelyxTransactionRow,
    AdjustInvoiceDialog,
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

  protected readonly resource = httpResource<Invoice>(
    () => `${environment.apiUrl}/invoices/${this.id()}`,
  );

  protected readonly invoice = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly t = injectTranslate();
  private readonly statusLabels = invoiceStatusLabels();

  protected readonly adjustOpen = signal(false);

  /** Zero-based page of the charge list, independent of the invoice summary above it. */
  protected readonly chargePage = signal(0);
  protected readonly chargeSize = signal(25);

  /**
   * Charges have their own paged endpoint rather than riding along on the invoice, so turning
   * a page does not refetch the totals in the header.
   */
  protected readonly chargesResource = httpResource<PageResponse<Transaction>>(
    () => ({
      url: `${environment.apiUrl}/invoices/${this.id()}/transactions`,
      params: { page: this.chargePage(), size: this.chargeSize() },
    }),
    { defaultValue: emptyPage<Transaction>() },
  );

  protected readonly charges = computed(() => this.chargesResource.value().content);
  protected readonly chargeTotal = computed(() => this.chargesResource.value().totalElements);

  /** The adjustment lands as a charge, so both the total and the charge list have moved. */
  protected onAdjusted(): void {
    this.resource.reload();
    this.chargesResource.reload();
  }

  protected onChargePage(event: PaginatorState): void {
    this.chargeSize.set(event.rows ?? this.chargeSize());
    this.chargePage.set(event.page ?? 0);
  }

  protected readonly heading = computed(() => {
    const inv = this.invoice();
    return inv
      ? this.t('invoices.cardInvoice', { card: this.cardName(inv.creditCardId) })
      : this.t('titles.invoice');
  });

  protected readonly periodText = computed(() => {
    const inv = this.invoice();
    return inv
      ? this.t('invoices.billingPeriod', {
          from: this.shortDate(inv.billingPeriodStart),
          to: this.shortDate(inv.billingPeriodEnd),
        })
      : '';
  });

  protected cardName(id: Uuid): string {
    return this.cards.byIdMap().get(id)?.name ?? this.t('dashboard.card');
  }

  protected category(id: Uuid): Category | undefined {
    return this.categories.byIdMap().get(id);
  }

  protected statusLabel(status: InvoiceStatus): string {
    return this.statusLabels()[status];
  }

  protected statusSeverity(status: InvoiceStatus): 'success' | 'warn' | 'info' {
    return INVOICE_STATUS_SEVERITY[status];
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected shortDate(iso: IsoDate): string {
    return shortDate(iso);
  }

  protected longDate(iso: IsoDate): string {
    return longDate(iso);
  }

  protected instant(value: string): string {
    return dateTime(value);
  }

  protected confirmPay(inv: Invoice): void {
    this.confirm.confirm({
      header: this.t('invoices.payHeader'),
      message: this.t('invoices.payMessage', { amount: formatMoney(inv.totalAmount) }),
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: this.t('invoices.markPaid') },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.invoices.pay(inv.id).subscribe(() => this.resource.reload());
      },
    });
  }

  protected confirmUnpay(inv: Invoice): void {
    this.confirm.confirm({
      header: this.t('invoices.unpayHeader'),
      message: this.t('invoices.unpayMessage'),
      icon: 'pi pi-undo',
      acceptButtonProps: { label: this.t('invoices.reopen'), severity: 'danger' },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.invoices.unpay(inv.id).subscribe(() => this.resource.reload());
      },
    });
  }
}
