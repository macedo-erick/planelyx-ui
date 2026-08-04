import { Component, computed, inject, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { Uuid } from '../../shared/models/common';
import { CreditCard } from '../../shared/models/credit-card';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { formatMoney } from '../../shared/util/money';
import { BankAccountService } from '../bank-accounts/bank-account.service';
import { CreditCardFormDialog } from './credit-card-form-dialog';
import { CreditCardService } from './credit-card.service';
import { StyleClass } from 'primeng/styleclass';

@Component({
  selector: 'fintrack-credit-cards-page',
  imports: [
    TableModule,
    Button,
    FintrackPageHeader,
    FintrackEmptyState,
    CreditCardFormDialog,
    StyleClass,
  ],
  templateUrl: './credit-cards-page.html',
})
export class CreditCardsPage {
  protected readonly service = inject(CreditCardService);
  private readonly accounts = inject(BankAccountService);
  private readonly confirm = inject(ConfirmationService);

  protected dialogOpen = signal(false);
  protected readonly selected = signal<CreditCard | null>(null);
  protected readonly cards = computed(() => this.service.sorted());
  protected readonly hasAccounts = computed(() => this.accounts.items().length > 0);

  protected accountName(id: Uuid): string {
    return this.accounts.byIdMap().get(id)?.name ?? '—';
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(card: CreditCard): void {
    this.selected.set(card);
    this.dialogOpen.set(true);
  }

  protected confirmDelete(card: CreditCard): void {
    this.confirm.confirm({
      header: 'Delete card',
      message: `Permanently delete "${card.name}"? Its charges and invoices will be affected.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.remove(card.id).subscribe();
      },
    });
  }
}
