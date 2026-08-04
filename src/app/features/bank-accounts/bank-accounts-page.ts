import { Component, computed, inject, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { BankAccount } from '../../shared/models/bank-account';
import { AccountType } from '../../shared/models/enums';
import { FintrackEmptyState } from '../../shared/ui/empty-state';
import { FintrackPageHeader } from '../../shared/ui/page-header';
import { ACCOUNT_TYPE_LABELS } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { BankAccountFormDialog } from './bank-account-form-dialog';
import { BankAccountService } from './bank-account.service';

@Component({
  selector: 'fintrack-bank-accounts-page',
  imports: [
    TableModule,
    Tag,
    Button,
    FintrackPageHeader,
    FintrackEmptyState,
    BankAccountFormDialog,
  ],
  templateUrl: './bank-accounts-page.html',
})
export class BankAccountsPage {
  protected readonly service = inject(BankAccountService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly dialogOpen = signal(false);
  protected readonly selected = signal<BankAccount | null>(null);
  protected readonly accounts = computed(() => this.service.sorted());

  protected typeLabel(type: AccountType): string {
    return ACCOUNT_TYPE_LABELS[type];
  }

  protected money(value: number, currency: string): string {
    return formatMoney(value, currency);
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(account: BankAccount): void {
    this.selected.set(account);
    this.dialogOpen.set(true);
  }

  protected confirmDelete(account: BankAccount): void {
    // The API hard-deletes accounts; there is no soft-deactivate.
    this.confirm.confirm({
      header: 'Delete account',
      message: `Permanently delete "${account.name}"? This cannot be undone, and any cards or transactions attached to it will be affected.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => {
        this.service.remove(account.id).subscribe();
      },
    });
  }
}
