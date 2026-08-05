export interface NavItem {
  /** Translation key, resolved in the template — the sidebar follows the language switch. */
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

/**
 * Ordered the way money is set up rather than the way it is reviewed: the accounts and cards
 * a transaction needs come before the transactions themselves.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'nav.dashboard', icon: 'pi pi-chart-pie', route: '/dashboard' },
  { label: 'nav.accounts', icon: 'pi pi-building-columns', route: '/accounts' },
  { label: 'nav.cards', icon: 'pi pi-credit-card', route: '/cards' },
  { label: 'nav.transactions', icon: 'pi pi-arrow-right-arrow-left', route: '/transactions' },
  { label: 'nav.invoices', icon: 'pi pi-receipt', route: '/invoices' },
  { label: 'nav.categories', icon: 'pi pi-tags', route: '/categories' },
];
