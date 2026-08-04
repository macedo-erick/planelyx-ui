export interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'pi pi-chart-pie', route: '/dashboard' },
  { label: 'Transactions', icon: 'pi pi-arrow-right-arrow-left', route: '/transactions' },
  { label: 'Invoices', icon: 'pi pi-receipt', route: '/invoices' },
  { label: 'Accounts', icon: 'pi pi-building-columns', route: '/accounts' },
  { label: 'Credit cards', icon: 'pi pi-credit-card', route: '/cards' },
  { label: 'Categories', icon: 'pi pi-tags', route: '/categories' },
];
