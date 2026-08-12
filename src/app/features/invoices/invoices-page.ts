import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Popover } from 'primeng/popover';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { injectTranslate } from '../../core/i18n/translate';
import { Category } from '../../shared/models/category';
import { IsoDate, MonthKey, Uuid } from '../../shared/models/common';
import { InvoiceStatus } from '../../shared/models/enums';
import { Invoice } from '../../shared/models/invoice';
import { emptyPage, PageResponse } from '../../shared/models/page';
import { Transaction } from '../../shared/models/transaction';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxMonthNav } from '../../shared/ui/month-nav';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { PlanelyxTransactionRow } from '../../shared/ui/transaction-row';
import {
  daysUntil,
  fromMonthKey,
  startOfMonth,
  todayIso,
  toMonthKey,
} from '../../shared/util/date';
import { shortDate } from '../../shared/util/date-format';
import { INVOICE_STATUS_SEVERITY, invoiceStatusLabels } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import {
  TransactionFormDialog,
  TransactionFormModel,
} from '../transactions/transaction-form-dialog';
import { AdjustInvoiceDialog } from './adjust-invoice-dialog';
import { InvoiceService } from './invoice.service';

/** The card and billing month the page is pointed at. */
interface InvoiceSelection {
  readonly cardId: Uuid | null;
  readonly month: Date;
}

/** One card, one month at a time. */
@Component({
  selector: 'planelyx-invoices-page',
  imports: [
    Button,
    Paginator,
    Popover,
    Select,
    Tag,
    FormsModule,
    PlanelyxCard,
    PlanelyxEmptyState,
    PlanelyxMonthNav,
    PlanelyxPageHeader,
    PlanelyxTransactionRow,
    TransactionFormDialog,
    AdjustInvoiceDialog,
  ],
  templateUrl: './invoices-page.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class InvoicesPage {
  protected readonly service = inject(InvoiceService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly t = injectTranslate();
  private readonly statusLabels = invoiceStatusLabels();

  protected readonly cardOptions = computed(() => this.cards.options());

  readonly cardId = input<Uuid | undefined>(undefined);
  readonly month = input<MonthKey | undefined>(undefined);

  private readonly fallbackMonth = startOfMonth(new Date());

  protected dialogOpen = signal(false);
  protected readonly adjustOpen = signal(false);
  protected readonly selected = signal<Transaction | null>(null);
  protected readonly prefill = signal<Partial<TransactionFormModel> | null>(null);

  private readonly firstUnpaid = computed(() => this.service.unpaid().at(-1) ?? null);

  /**
   * Where the page opens: the card and month named in the route, else the oldest unpaid
   * invoice's. `null` until the cards and invoices have both landed.
   */
  private readonly initialSelection = computed<InvoiceSelection | null>(() => {
    const status = this.service.resource.status();
    const cards = this.cards.sorted();

    if (cards.length === 0 || (status !== 'resolved' && status !== 'error')) {
      return null;
    }

    const requestedCard = this.cardId();
    const requestedMonth = fromMonthKey(this.month());

    if (requestedCard && requestedMonth) {
      return { cardId: requestedCard, month: startOfMonth(requestedMonth) };
    }

    const pending = this.firstUnpaid();

    return {
      cardId: pending?.creditCardId ?? cards[0].id,
      month: startOfMonth(fromMonthKey(pending?.referenceMonth) ?? this.fallbackMonth),
    };
  });

  /**
   * Seeds once, then holds whatever the reader picked — a non-null `previous` wins over the
   * source, so reloading the invoices behind an open page never yanks the selection back.
   */
  private readonly selection = linkedSignal<InvoiceSelection | null, InvoiceSelection | null>({
    source: this.initialSelection,
    computation: (initial, previous) => previous?.value ?? initial,
  });

  protected readonly selectedCardId = computed(() => this.selection()?.cardId ?? null);

  protected readonly selectedMonth = computed(() => this.selection()?.month ?? this.fallbackMonth);

  protected readonly invoice = computed(() => {
    const cardId = this.selectedCardId();
    const month = toMonthKey(this.selectedMonth());
    if (!cardId) {
      return null;
    }

    return (
      this.service
        .sorted()
        .find(
          (candidate) => candidate.creditCardId === cardId && candidate.referenceMonth === month,
        ) ?? null
    );
  });

  protected readonly chargePage = linkedSignal({
    source: () => this.invoice()?.id ?? null,
    computation: () => 0,
  });
  protected readonly chargeSize = signal(25);

  protected readonly detail = httpResource<PageResponse<Transaction>>(
    () => {
      const current = this.invoice();
      return current
        ? {
            url: `${environment.apiUrl}/invoices/${current.id}/transactions`,
            params: { page: 0, size: 2000 },
          }
        : undefined;
    },
    { defaultValue: emptyPage<Transaction>() },
  );

  protected readonly charges = computed(() => this.detail.value().content);

  protected readonly chargeTotal = computed(() => this.charges().length);

  protected readonly pagedCharges = computed(() => {
    const start = this.chargePage() * this.chargeSize();
    return this.charges().slice(start, start + this.chargeSize());
  });

  protected onCardChange(cardId: Uuid | null): void {
    this.selection.update((current) => ({ cardId, month: current?.month ?? this.fallbackMonth }));
  }

  protected onMonthChange(month: Date): void {
    this.selection.update((current) => ({ cardId: current?.cardId ?? null, month }));
  }

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

  protected dueHint(invoice: Invoice): { text: string; overdue: boolean } | null {
    if (invoice.status === 'PAID') {
      return null;
    }
    const days = daysUntil(invoice.dueDate);
    if (days === null) {
      return null;
    }
    if (days < 0) {
      return { text: this.t('invoices.overdue', { days: Math.abs(days) }), overdue: true };
    }
    if (days === 0) {
      return { text: this.t('invoices.dueToday'), overdue: true };
    }
    return days <= 7 ? { text: this.t('invoices.dueInDays', { days }), overdue: false } : null;
  }

  protected openEdit(tx: Transaction): void {
    this.selected.set(tx);
    this.prefill.set(null);
    this.dialogOpen.set(true);
  }

  /** Opens the dialog already pointed at this card and billing period. */
  protected openCreate(inv: Invoice): void {
    const today = todayIso();
    const withinPeriod = today >= inv.billingPeriodStart && today <= inv.billingPeriodEnd;

    this.selected.set(null);
    this.prefill.set({
      kind: 'CARD_CHARGE',
      bankAccountId: null,
      creditCardId: inv.creditCardId,
      transactionDate: withinPeriod ? today : inv.billingPeriodEnd,
    });
    this.dialogOpen.set(true);
  }

  protected onChargePage(event: PaginatorState): void {
    this.chargeSize.set(event.rows ?? this.chargeSize());
    this.chargePage.set(event.page ?? 0);
  }

  protected confirmPay(invoice: Invoice): void {
    this.confirm.confirm({
      header: this.t('invoices.payHeader'),
      message: this.t('invoices.payMessage', { amount: formatMoney(invoice.totalAmount) }),
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: this.t('invoices.markPaid') },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.service
          .pay(invoice.id, this.t('invoices.paymentDescription'))
          .subscribe(() => this.cards.reload());
      },
    });
  }

  protected confirmUnpay(invoice: Invoice): void {
    this.confirm.confirm({
      header: this.t('invoices.unpayHeader'),
      message: this.t('invoices.unpayMessage'),
      icon: 'pi pi-undo',
      acceptButtonProps: { label: this.t('invoices.reopen'), severity: 'danger' },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.service.unpay(invoice.id).subscribe(() => this.cards.reload());
      },
    });
  }

  /** Deleting an invoice takes its charges with it, so the message says so. */
  protected confirmDelete(invoice: Invoice): void {
    this.confirm.confirm({
      header: this.t('invoices.deleteHeader'),
      message: this.t('invoices.deleteMessage', { amount: formatMoney(invoice.totalAmount) }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: this.t('common.delete'), severity: 'danger' },
      rejectButtonProps: { label: this.t('common.cancel'), severity: 'secondary', text: true },
      accept: () => {
        this.service.remove(invoice.id).subscribe(() => this.cards.reload());
      },
    });
  }
}
