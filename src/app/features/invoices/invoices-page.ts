import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Popover } from 'primeng/popover';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { InvoiceStatus } from '../../shared/models/enums';
import { Invoice } from '../../shared/models/invoice';
import { emptyPage, PageResponse } from '../../shared/models/page';
import { Transaction } from '../../shared/models/transaction';
import { FintrackCard } from '../../shared/ui/card';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackMonthNav } from '../../shared/ui/month-nav';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { FintrackTransactionRow } from '../../shared/ui/transaction-row';
import { daysUntil, fromIsoDate, startOfMonth, todayIso } from '../../shared/util/date';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_SEVERITY } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import {
  TransactionFormDialog,
  TransactionFormModel,
} from '../transactions/transaction-form-dialog';
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
  selector: 'fintrack-invoices-page',
  imports: [
    Button,
    Paginator,
    Popover,
    RouterLink,
    Select,
    Tag,
    FormsModule,
    FintrackCard,
    FintrackEmptyState,
    FintrackMonthNav,
    FintrackPageHeader,
    FintrackTransactionRow,
    TransactionFormDialog,
  ],
  templateUrl: './invoices-page.html',
})
export class InvoicesPage {
  protected readonly service = inject(InvoiceService);
  private readonly cards = inject(CreditCardService);
  private readonly categories = inject(CategoryService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly cardOptions = computed(() => this.cards.options());

  protected readonly selectedCardId = signal<Uuid | null>(null);
  protected readonly month = signal(startOfMonth(new Date()));

  protected dialogOpen = signal(false);
  protected readonly selected = signal<Transaction | null>(null);
  protected readonly prefill = signal<Partial<TransactionFormModel> | null>(null);

  /**
   * The card and month the page lands on: the oldest invoice that is still unpaid, since
   * that is the one asking for money. Installments push open invoices months into the
   * future, so landing on the newest one shows a bill nobody has to think about yet.
   */
  private readonly firstUnpaid = computed(() => this.service.unpaid().at(-1) ?? null);

  /**
   * The invoice is keyed on the month it closes in, not the month it starts in — a period
   * running 11 May to 10 Jun is the "Jun" invoice, which is how the due date reads.
   */
  protected readonly invoice = computed(() => {
    const cardId = this.selectedCardId();
    const month = this.month();
    if (!cardId) {
      return null;
    }

    return (
      this.service.sorted().find((candidate) => {
        if (candidate.creditCardId !== cardId) {
          return false;
        }
        const end = fromIsoDate(candidate.billingPeriodEnd);
        return (
          end !== null &&
          end.getFullYear() === month.getFullYear() &&
          end.getMonth() === month.getMonth()
        );
      }) ?? null
    );
  });

  /** Zero-based page of the charge list, independent of the invoice summary above it. */
  protected readonly chargePage = signal(0);
  protected readonly chargeSize = signal(25);

  /**
   * Charges come from their own paged endpoint rather than riding along on the invoice, so
   * turning a page does not refetch the totals shown in the header.
   */
  protected readonly detail = httpResource<PageResponse<Transaction>>(
    () => {
      const current = this.invoice();
      return current
        ? {
            url: `${environment.apiUrl}/invoices/${current.id}/transactions`,
            params: { page: this.chargePage(), size: this.chargeSize() },
          }
        : undefined;
    },
    { defaultValue: emptyPage<Transaction>() },
  );

  protected readonly charges = computed(() => this.detail.value().content);
  protected readonly chargeTotal = computed(() => this.detail.value().totalElements);

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

      const pending = this.firstUnpaid();
      this.selectedCardId.set(pending?.creditCardId ?? cards[0].id);

      const end = pending ? fromIsoDate(pending.billingPeriodEnd) : null;
      this.month.set(startOfMonth(end ?? new Date()));
    });
  }

  protected onCardChange(cardId: Uuid | null): void {
    this.selectedCardId.set(cardId);
  }

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
      header: 'Mark invoice as paid',
      message: `Mark the ${this.cardName(invoice.creditCardId)} invoice of ${formatMoney(invoice.totalAmount)} as paid?`,
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: 'Mark paid' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.pay(invoice.id).subscribe(() => this.cards.reload());
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
        this.service.unpay(invoice.id).subscribe(() => this.cards.reload());
      },
    });
  }
}
