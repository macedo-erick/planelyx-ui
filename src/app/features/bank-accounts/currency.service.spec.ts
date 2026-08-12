import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { BankAccount } from '../../shared/models/bank-account';
import { CreditCard } from '../../shared/models/credit-card';
import { CurrencyService } from './currency.service';

const BRL_ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const USD_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222';
const USD_CARD_ID = '33333333-3333-3333-3333-333333333333';

const account = (id: string, currency: string): BankAccount => ({
  id,
  name: `Account ${currency}`,
  bankName: 'Nubank',
  accountType: 'CHECKING',
  initialBalance: 0,
  currency,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
});

const CARD: CreditCard = {
  id: USD_CARD_ID,
  bankAccountId: USD_ACCOUNT_ID,
  name: 'Travel',
  brand: 'VISA',
  creditLimit: 1000,
  usedLimit: 0,
  availableLimit: 1000,
  closingDay: 10,
  dueDay: 17,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('CurrencyService', () => {
  let currencies: CurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    currencies = TestBed.inject(CurrencyService);

    // The resources are eager, but only issue their requests once effects have flushed.
    TestBed.tick();

    const http = TestBed.inject(HttpTestingController);
    http
      .match(`${environment.apiUrl}/bank-accounts`)
      .forEach((req) =>
        req.flush([account(BRL_ACCOUNT_ID, 'BRL'), account(USD_ACCOUNT_ID, 'USD')]),
      );
    http.match(`${environment.apiUrl}/bank-accounts/balances`).forEach((req) => req.flush([]));
    http.match(`${environment.apiUrl}/credit-cards`).forEach((req) => req.flush([CARD]));

    TestBed.tick();
  });

  it("reads an account's own currency", () => {
    expect(currencies.forAccount(BRL_ACCOUNT_ID)).toBe('BRL');
    expect(currencies.forAccount(USD_ACCOUNT_ID)).toBe('USD');
  });

  it('bills a card in the currency of the account it settles against', () => {
    expect(currencies.forCard(USD_CARD_ID)).toBe('USD');
  });

  it('follows whichever side a transaction hangs off', () => {
    expect(currencies.forSource({ bankAccountId: BRL_ACCOUNT_ID, creditCardId: null })).toBe('BRL');
    expect(currencies.forSource({ bankAccountId: null, creditCardId: USD_CARD_ID })).toBe('USD');
  });

  it('prefers the card when a transaction somehow carries both', () => {
    expect(currencies.forSource({ bankAccountId: BRL_ACCOUNT_ID, creditCardId: USD_CARD_ID })).toBe(
      'USD',
    );
  });

  it('falls back to the configured currency for anything unresolvable', () => {
    expect(currencies.forSource(null)).toBe(environment.defaultCurrency);
    expect(currencies.forAccount(null)).toBe(environment.defaultCurrency);
    expect(currencies.forAccount('missing')).toBe(environment.defaultCurrency);
    expect(currencies.forCard('missing')).toBe(environment.defaultCurrency);
  });
});
