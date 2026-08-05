import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'titles.dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'transactions',
        title: 'titles.transactions',
        loadComponent: () =>
          import('./features/transactions/transactions-page').then((m) => m.TransactionsPage),
      },
      { path: 'recurring', pathMatch: 'full', redirectTo: 'transactions' },
      {
        path: 'invoices',
        title: 'titles.invoices',
        loadComponent: () =>
          import('./features/invoices/invoices-page').then((m) => m.InvoicesPage),
      },
      {
        path: 'invoices/:id',
        title: 'titles.invoice',
        loadComponent: () =>
          import('./features/invoices/invoice-detail-page').then((m) => m.InvoiceDetailPage),
      },
      {
        path: 'accounts',
        title: 'titles.accounts',
        loadComponent: () =>
          import('./features/bank-accounts/bank-accounts-page').then((m) => m.BankAccountsPage),
      },
      {
        path: 'cards',
        title: 'titles.cards',
        loadComponent: () =>
          import('./features/credit-cards/credit-cards-page').then((m) => m.CreditCardsPage),
      },
      {
        path: 'categories',
        title: 'titles.categories',
        loadComponent: () =>
          import('./features/categories/categories-page').then((m) => m.CategoriesPage),
      },
      {
        path: 'profile',
        title: 'titles.profile',
        loadComponent: () => import('./features/settings/profile-page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: '**',
    title: 'titles.notFound',
    loadComponent: () => import('./features/not-found-page').then((m) => m.NotFoundPage),
  },
];
