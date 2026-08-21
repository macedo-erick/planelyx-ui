import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { OCR_ADMIN_ROLE, requireRole } from './core/auth/role.guard';
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
        path: 'ingest',
        title: 'titles.ingest',
        loadComponent: () => import('./features/ingest/ingest-page').then((m) => m.IngestPage),
      },
      {
        path: 'ingest/:id',
        title: 'titles.reviewDocument',
        loadComponent: () =>
          import('./features/ingest/document-review-page').then((m) => m.DocumentReviewPage),
      },
      {
        path: 'invoices',
        title: 'titles.invoices',
        loadComponent: () =>
          import('./features/invoices/invoices-page').then((m) => m.InvoicesPage),
      },
      { path: 'invoices/:id', pathMatch: 'full', redirectTo: 'invoices' },
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
        path: 'settings/imports',
        title: 'titles.importSettings',
        canActivate: [requireRole(OCR_ADMIN_ROLE)],
        loadComponent: () =>
          import('./features/settings/import-settings-page').then((m) => m.ImportSettingsPage),
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
