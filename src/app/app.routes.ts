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
        title: 'Dashboard · Planelyx',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'transactions',
        title: 'Transactions · Planelyx',
        loadComponent: () =>
          import('./features/transactions/transactions-page').then((m) => m.TransactionsPage),
      },
      { path: 'recurring', pathMatch: 'full', redirectTo: 'transactions' },
      {
        path: 'invoices',
        title: 'Invoices · Planelyx',
        loadComponent: () =>
          import('./features/invoices/invoices-page').then((m) => m.InvoicesPage),
      },
      {
        path: 'invoices/:id',
        title: 'Invoice · Planelyx',
        loadComponent: () =>
          import('./features/invoices/invoice-detail-page').then((m) => m.InvoiceDetailPage),
      },
      {
        path: 'accounts',
        title: 'Bank accounts · Planelyx',
        loadComponent: () =>
          import('./features/bank-accounts/bank-accounts-page').then((m) => m.BankAccountsPage),
      },
      {
        path: 'cards',
        title: 'Credit cards · Planelyx',
        loadComponent: () =>
          import('./features/credit-cards/credit-cards-page').then((m) => m.CreditCardsPage),
      },
      {
        path: 'categories',
        title: 'Categories · Planelyx',
        loadComponent: () =>
          import('./features/categories/categories-page').then((m) => m.CategoriesPage),
      },
    ],
  },
  {
    path: '**',
    title: 'Not found · Planelyx',
    loadComponent: () => import('./features/not-found-page').then((m) => m.NotFoundPage),
  },
];
