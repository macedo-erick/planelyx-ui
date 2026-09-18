import { Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { injectTranslate } from '../../core/i18n/translate';
import { Money } from '../../shared/models/common';
import { InvestmentType } from '../../shared/models/enums';
import { Investment } from '../../shared/models/investment';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { shortDate } from '../../shared/util/date-format';
import { investmentTypeLabels } from '../../shared/util/enum-labels';
import { formatMoney } from '../../shared/util/money';
import { AdjustInvestmentBalanceDialog } from './adjust-investment-balance-dialog';
import { InvestmentFormDialog } from './investment-form-dialog';
import { InvestmentMovementDialog, MovementDirection } from './investment-movement-dialog';
import { InvestmentService } from './investment.service';

@Component({
  selector: 'planelyx-investments-page',
  imports: [
    Tag,
    Button,
    PlanelyxCard,
    PlanelyxPageHeader,
    PlanelyxEmptyState,
    InvestmentFormDialog,
    InvestmentMovementDialog,
    AdjustInvestmentBalanceDialog,
  ],
  templateUrl: './investments-page.html',
})
export class InvestmentsPage {
  protected readonly service = inject(InvestmentService);
  protected readonly t = injectTranslate();
  private readonly typeLabels = investmentTypeLabels();

  protected dialogOpen = signal(false);
  protected movementOpen = signal(false);
  protected adjustOpen = signal(false);

  protected readonly selected = signal<Investment | null>(null);
  protected readonly direction = signal<MovementDirection>('CONTRIBUTE');
  protected readonly investments = computed(() => this.service.sorted());

  protected readonly currency = computed(
    () => this.investments()[0]?.currency ?? this.service.items()[0]?.currency ?? 'BRL',
  );

  protected readonly investedTotal = computed(() => this.service.investedTotal());
  protected readonly contributedTotal = computed(() => this.service.contributedTotal());
  protected readonly returnTotal = computed(() => this.investedTotal() - this.contributedTotal());

  constructor() {
    this.service.reloadBalances();
  }

  protected typeLabel(type: InvestmentType): string {
    return this.typeLabels()[type];
  }

  protected money(value: number, currency: string): string {
    return formatMoney(value, currency);
  }

  protected balance(investment: Investment): Money {
    return this.service.balanceFor(investment.id) ?? investment.initialBalance;
  }

  protected contributed(investment: Investment): Money {
    return this.service.contributedFor(investment.id) ?? investment.initialBalance;
  }

  /** Yield and losses, whatever the movements were. */
  protected returned(investment: Investment): Money {
    return this.balance(investment) - this.contributed(investment);
  }

  protected returnLabel(value: Money, currency: string): string {
    return `${value >= 0 ? '+' : '−'}${formatMoney(Math.abs(value), currency)}`;
  }

  protected asOfLabel(): string | null {
    const asOf = this.service.balancesAsOf();

    return asOf ? this.t('investments.projectedTo', { date: shortDate(asOf) }) : null;
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(investment: Investment): void {
    this.selected.set(investment);
    this.dialogOpen.set(true);
  }

  protected openMovement(investment: Investment, direction: MovementDirection): void {
    this.selected.set(investment);
    this.direction.set(direction);
    this.movementOpen.set(true);
  }

  protected openAdjust(investment: Investment): void {
    this.selected.set(investment);
    this.adjustOpen.set(true);
  }
}
