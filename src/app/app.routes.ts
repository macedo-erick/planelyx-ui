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
        title: 'Dashboard · Fintrack',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'transactions',
        title: 'Transactions · Fintrack',
        loadComponent: () =>
          import('./features/transactions/transactions-page').then((m) => m.TransactionsPage),
      },
      // Recurring rules now live inside Transactions; keep old links working.
      { path: 'recurring', pathMatch: 'full', redirectTo: 'transactions' },
      {
        path: 'invoices',
        title: 'Invoices · Fintrack',
        loadComponent: () =>
          import('./features/invoices/invoices-page').then((m) => m.InvoicesPage),
      },
      {
        path: 'invoices/:id',
        title: 'Invoice · Fintrack',
        loadComponent: () =>
          import('./features/invoices/invoice-detail-page').then((m) => m.InvoiceDetailPage),
      },
      {
        path: 'accounts',
        title: 'Bank accounts · Fintrack',
        loadComponent: () =>
          import('./features/bank-accounts/bank-accounts-page').then((m) => m.BankAccountsPage),
      },
      {
        path: 'cards',
        title: 'Credit cards · Fintrack',
        loadComponent: () =>
          import('./features/credit-cards/credit-cards-page').then((m) => m.CreditCardsPage),
      },
      {
        path: 'categories',
        title: 'Categories · Fintrack',
        loadComponent: () =>
          import('./features/categories/categories-page').then((m) => m.CategoriesPage),
      },
    ],
  },
  {
    path: '**',
    title: 'Not found · Fintrack',
    loadComponent: () => import('./features/not-found-page').then((m) => m.NotFoundPage),
  },
];
