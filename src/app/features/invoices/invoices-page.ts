import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
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

/**
 * One card, one month at a time.
 *
 * A card's invoices are a monthly series, so paging through them a month at a time reads
 * far better than a flat table of every invoice ever. Filtering is client-side: the API
 * takes no date parameter, and the whole set is one row per card per month — small enough
 * that fetching it once and slicing locally beats a round trip per step.
 */
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

  /**
   * Optional query params naming the invoice to open, bound by `withComponentInputBinding`.
   *
   * The dashboard links here with both set, which is what replaced the separate detail page:
   * clicking an invoice lands on this screen already showing it, rather than on whichever card
   * and month the page would have picked for itself.
   */
  readonly cardId = input<Uuid | undefined>(undefined);
  readonly month = input<MonthKey | undefined>(undefined);

  protected readonly selectedCardId = signal<Uuid | null>(null);
  protected readonly selectedMonth = signal(startOfMonth(new Date()));

  protected dialogOpen = signal(false);
  protected readonly adjustOpen = signal(false);
  protected readonly selected = signal<Transaction | null>(null);
  protected readonly prefill = signal<Partial<TransactionFormModel> | null>(null);

  /**
   * The card and month the page lands on: the oldest invoice that is still unpaid, since
   * that is the one asking for money. Installments push open invoices months into the
   * future, so landing on the newest one shows a bill nobody has to think about yet.
   */
  private readonly firstUnpaid = computed(() => this.service.unpaid().at(-1) ?? null);

  /**
   * The invoice is keyed on `referenceMonth` — the month it falls due in.
   *
   * It used to be keyed on the month the period *closed* in, which is the same month only while
   * the due day falls later in the month than the closing day. On a card closing the 28th and due
   * the 5th, the period 29 Jul – 28 Aug closes in August but is paid in September, so it showed
   * under "Ago" here while the dashboard listed it under its September due date. Both now read
   * the one value the API derives.
   */
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

  /**
   * Zero-based page of the charge list, independent of the invoice summary above it. Switching
   * card or month starts over at the first page — page 3 of the invoice you just left says
   * nothing about the one you just opened, and a short invoice would render blank.
   */
  protected readonly chargePage = linkedSignal({
    source: () => this.invoice()?.id ?? null,
    computation: () => 0,
  });
  protected readonly chargeSize = signal(25);

  /**
   * Charges come from their own paged endpoint rather than riding along on the invoice, so
   * reloading them does not refetch the totals shown in the header.
   *
   * The whole invoice is fetched at once because the rows are reordered by purchase date on
   * this side: sorting one server page at a time would put the same charge in a different place
   * depending on which page it landed on. An invoice is a few dozen charges — the same reasoning
   * that already has this screen slicing the invoice list locally.
   */
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

  /**
   * Newest purchase first, which is the API's own order for everything except installments —
   * those carry the date of the purchase they came from, so a series bought months ago sinks
   * below the charges actually made this month instead of being scattered among them.
   */
  protected readonly charges = computed(() =>
    [...this.detail.value().content].sort((a, b) => {
      const byPurchase = b.purchaseDate.localeCompare(a.purchaseDate);
      return byPurchase !== 0 ? byPurchase : b.createdAt.localeCompare(a.createdAt);
    }),
  );

  protected readonly chargeTotal = computed(() => this.charges().length);

  protected readonly pagedCharges = computed(() => {
    const start = this.chargePage() * this.chargeSize();
    return this.charges().slice(start, start + this.chargeSize());
  });

  constructor() {
    // Land on the unpaid invoice once the lists have arrived, then leave the choice alone —
    // a reload after pay/unpay must not yank the user back off the month they were on.
    let seeded = false;
    effect(() => {
      const status = this.service.resource.status();
      const cards = this.cards.sorted();
      if (seeded || cards.length === 0 || (status !== 'resolved' && status !== 'error')) {
        return;
      }
      seeded = true;

      // A link in from the dashboard names the invoice it meant; otherwise fall back to the
      // oldest unpaid one.
      const requestedCard = this.cardId();
      const requestedMonth = fromMonthKey(this.month());

      if (requestedCard && requestedMonth) {
        this.selectedCardId.set(requestedCard);
        this.selectedMonth.set(startOfMonth(requestedMonth));
        return;
      }

      const pending = this.firstUnpaid();
      this.selectedCardId.set(pending?.creditCardId ?? cards[0].id);
      this.selectedMonth.set(startOfMonth(fromMonthKey(pending?.referenceMonth) ?? new Date()));
    });
  }

  protected onCardChange(cardId: Uuid | null): void {
    this.selectedCardId.set(cardId);
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

  /**
   * Opens the dialog already pointed at this card and billing period.
   *
   * The date matters: the API files a charge onto whichever invoice its date falls in, so a
   * date outside this period would silently open the next month's invoice instead. Today is
   * used when it falls inside the period, and the closing date otherwise.
   */
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
        this.service.pay(invoice.id).subscribe(() => this.cards.reload());
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

  /**
   * Deleting an invoice takes its charges with it, so the message says so — there is no way back
   * from this one, and the amount is the clearest statement of what is about to go.
   */
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
