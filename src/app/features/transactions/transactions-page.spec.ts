import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { PaginatorState } from 'primeng/paginator';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { provideTestingTransloco } from '../../../testing/transloco';
import { BankAccount } from '../../shared/models/bank-account';
import { CreditCard } from '../../shared/models/credit-card';
import { TransactionKind } from '../../shared/models/enums';
import { TransactionFilters } from '../../shared/models/transaction';
import { SelectOption } from '../../shared/util/enum-labels';
import { TransactionsPage } from './transactions-page';
import { TransactionService } from './transaction.service';

interface TransactionsPageInternals {
  onKindChange(kind: TransactionKind | null): void;
  onBankAccountChange(bankAccountId: string | null): void;
  onCreditCardChange(creditCardId: string | null): void;
  clearFilters(): void;
  bankAccountFilter(): string | null;
  creditCardFilter(): string | null;
  accountFilterVisible(): boolean;
  cardFilterVisible(): boolean;
  accountOptions(): SelectOption<string>[];
  cardOptions(): SelectOption<string>[];
  onPage(event: PaginatorState): void;
  page(): number;
}

const ACTIVE_ACCOUNT = '11111111-1111-1111-1111-111111111111';
const CLOSED_ACCOUNT = '22222222-2222-2222-2222-222222222222';
const ACTIVE_CARD = '33333333-3333-3333-3333-333333333333';
const CANCELLED_CARD = '44444444-4444-4444-4444-444444444444';

const account = (overrides: Partial<BankAccount>): BankAccount => ({
  id: ACTIVE_ACCOUNT,
  name: 'Checking',
  bankName: 'Nubank',
  accountType: 'CHECKING',
  initialBalance: 0,
  currency: 'BRL',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const card = (overrides: Partial<CreditCard>): CreditCard => ({
  id: ACTIVE_CARD,
  bankAccountId: ACTIVE_ACCOUNT,
  name: 'Platinum',
  brand: 'Visa',
  creditLimit: 1000,
  usedLimit: 0,
  availableLimit: 1000,
  closingDay: 28,
  dueDay: 5,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('TransactionsPage', () => {
  let fixture: ComponentFixture<TransactionsPage>;
  let page: TransactionsPageInternals;
  let service: TransactionService;

  /** Applies pending signal writes and lets the filter effect push to the service. */
  function settle(): void {
    fixture.detectChanges();
  }

  function filters(): TransactionFilters {
    settle();
    return service.filters();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [provideTestingTransloco()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        providePrimeNG({}),
        MessageService,
        ConfirmationService,
      ],
    });

    fixture = TestBed.createComponent(TransactionsPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);

    /** The filter effect repoints the resources on the first pass, cancelling their first fetch. */
    const answer = (url: string | null, body: object): void =>
      http
        .match((req) => (url === null ? true : req.url === url))
        .forEach((req) => {
          if (!req.cancelled) {
            req.flush(body);
          }
        });

    answer(`${environment.apiUrl}/bank-accounts`, [
      account({}),
      account({ id: CLOSED_ACCOUNT, name: 'Old savings', active: false }),
    ]);
    answer(`${environment.apiUrl}/credit-cards`, [
      card({}),
      card({ id: CANCELLED_CARD, name: 'Cancelled', active: false }),
    ]);
    answer(`${environment.apiUrl}/transactions`, {
      content: [],
      page: 0,
      size: 25,
      totalElements: 0,
      totalPages: 0,
    });
    answer(`${environment.apiUrl}/transactions/summary`, {
      totalIncome: 0,
      totalExpense: 0,
      net: 0,
      count: 0,
    });
    answer(null, []);

    fixture.detectChanges();

    service = TestBed.inject(TransactionService);
    page = fixture.componentInstance as unknown as TransactionsPageInternals;
  });

  describe('option lists', () => {
    it('leaves closed accounts out of the filter', () => {
      expect(page.accountOptions().map((o) => o.value)).toEqual([ACTIVE_ACCOUNT]);
    });

    it('leaves cancelled cards out of the filter', () => {
      expect(page.cardOptions().map((o) => o.value)).toEqual([ACTIVE_CARD]);
    });
  });

  describe('visibility follows the kind filter', () => {
    it('offers both sources while no kind is chosen', () => {
      expect(page.accountFilterVisible()).toBe(true);
      expect(page.cardFilterVisible()).toBe(true);
    });

    it('offers only the account for kinds that settle against an account', () => {
      page.onKindChange('ACCOUNT_DEBIT');
      expect(page.accountFilterVisible()).toBe(true);
      expect(page.cardFilterVisible()).toBe(false);

      page.onKindChange('ACCOUNT_CREDIT');
      expect(page.accountFilterVisible()).toBe(true);
      expect(page.cardFilterVisible()).toBe(false);
    });

    it('offers only the card for a card charge', () => {
      page.onKindChange('CARD_CHARGE');
      expect(page.accountFilterVisible()).toBe(false);
      expect(page.cardFilterVisible()).toBe(true);
    });
  });

  describe('the two sources are mutually exclusive', () => {
    it('drops the card when an account is picked', () => {
      page.onCreditCardChange(ACTIVE_CARD);
      page.onBankAccountChange(ACTIVE_ACCOUNT);

      expect(page.bankAccountFilter()).toBe(ACTIVE_ACCOUNT);
      expect(page.creditCardFilter()).toBeNull();
    });

    it('drops the account when a card is picked', () => {
      page.onBankAccountChange(ACTIVE_ACCOUNT);
      page.onCreditCardChange(ACTIVE_CARD);

      expect(page.creditCardFilter()).toBe(ACTIVE_CARD);
      expect(page.bankAccountFilter()).toBeNull();
    });

    it('keeps the other source when one is merely cleared', () => {
      page.onBankAccountChange(ACTIVE_ACCOUNT);
      page.onCreditCardChange(null);

      expect(page.bankAccountFilter()).toBe(ACTIVE_ACCOUNT);
    });
  });

  describe('a hidden source filter never reaches the query', () => {
    it('drops the account when switching to a card kind', () => {
      page.onBankAccountChange(ACTIVE_ACCOUNT);
      page.onKindChange('CARD_CHARGE');

      expect(page.bankAccountFilter()).toBeNull();
      expect(filters().bankAccountId).toBeUndefined();
    });

    it('drops the card when switching to an account kind', () => {
      page.onCreditCardChange(ACTIVE_CARD);
      page.onKindChange('ACCOUNT_DEBIT');

      expect(page.creditCardFilter()).toBeNull();
      expect(filters().creditCardId).toBeUndefined();
    });

    it('keeps the chosen source when widening back to any kind', () => {
      page.onBankAccountChange(ACTIVE_ACCOUNT);
      page.onKindChange('ACCOUNT_DEBIT');
      page.onKindChange(null);

      expect(page.bankAccountFilter()).toBe(ACTIVE_ACCOUNT);
    });
  });

  it('sends the chosen source to the API', () => {
    page.onBankAccountChange(ACTIVE_ACCOUNT);
    expect(filters().bankAccountId).toBe(ACTIVE_ACCOUNT);

    page.onCreditCardChange(ACTIVE_CARD);
    expect(filters()).toMatchObject({ creditCardId: ACTIVE_CARD, bankAccountId: undefined });
  });

  it('clears both sources along with the rest', () => {
    page.onBankAccountChange(ACTIVE_ACCOUNT);
    page.clearFilters();
    expect(page.bankAccountFilter()).toBeNull();

    page.onCreditCardChange(ACTIVE_CARD);
    page.clearFilters();
    expect(page.creditCardFilter()).toBeNull();
  });

  it('returns to the first page when a source filter changes', () => {
    page.onPage({ page: 3, rows: 25 });
    expect(page.page()).toBe(3);

    page.onBankAccountChange(ACTIVE_ACCOUNT);
    expect(page.page()).toBe(0);

    page.onPage({ page: 2, rows: 25 });
    page.onCreditCardChange(ACTIVE_CARD);
    expect(page.page()).toBe(0);
  });
});
