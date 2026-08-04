import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { Category } from '../../shared/models/category';
import { IsoDate, Uuid } from '../../shared/models/common';
import { InvoiceStatus } from '../../shared/models/enums';
import { Invoice, InvoiceDetail } from '../../shared/models/invoice';
import { Transaction } from '../../shared/models/transaction';
import { FintrackCard } from '../../shared/ui/card';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackMonthNav } from '../../shared/ui/month-nav';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { FintrackTransactionRow } from '../../shared/ui/transaction-row';
import { daysUntil, fromIsoDate, startOfMonth } from '../../shared/util/date';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_SEVERITY } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { CategoryService } from '../categories/category.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { TransactionFormDialog } from '../transactions/transaction-form-dialog';
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
    Menu,
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
  private readonly router = inject(Router);

  protected readonly cardOptions = computed(() => this.cards.options());

  protected readonly selectedCardId = signal<Uuid | null>(null);
  protected readonly month = signal(startOfMonth(new Date()));

  protected dialogOpen = signal(false);
  protected readonly selected = signal<Transaction | null>(null);

  /** The card and month the page lands on: whatever is still open, newest first. */
  private readonly firstOpen = computed(
    () => this.service.sorted().find((invoice) => invoice.status === 'OPEN') ?? null,
  );

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

  /** The list payload has no charges on it, so the detail endpoint fills them in. */
  protected readonly detail = httpResource<InvoiceDetail>(() => {
    const current = this.invoice();
    return current ? `${environment.apiUrl}/invoices/${current.id}` : undefined;
  });

  protected readonly charges = computed(() =>
    this.detail.hasValue() ? [...this.detail.value().transactions] : [],
  );

  protected readonly menuItems = computed<MenuItem[]>(() => {
    const current = this.invoice();
    if (!current) {
      return [];
    }

    const payItem: MenuItem =
      current.status === 'PAID'
        ? { label: 'Undo payment', icon: 'pi pi-undo', command: () => this.confirmUnpay(current) }
        : {
            label: 'Mark as paid',
            icon: 'pi pi-check-circle',
            disabled: current.totalAmount === 0,
            command: () => this.confirmPay(current),
          };

    return [
      payItem,
      {
        label: 'View details',
        icon: 'pi pi-external-link',
        command: () => void this.router.navigate(['/invoices', current.id]),
      },
    ];
  });

  constructor() {
    // Land on the open invoice once the lists have arrived, then leave the choice alone —
    // a reload after pay/unpay must not yank the user back off the month they were on.
    let seeded = false;
    effect(() => {
      const status = this.service.resource.status();
      const cards = this.cards.sorted();
      if (seeded || cards.length === 0 || (status !== 'resolved' && status !== 'error')) {
        return;
      }
      seeded = true;

      const open = this.firstOpen();
      this.selectedCardId.set(open?.creditCardId ?? cards[0].id);

      const end = open ? fromIsoDate(open.billingPeriodEnd) : null;
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
    this.dialogOpen.set(true);
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
