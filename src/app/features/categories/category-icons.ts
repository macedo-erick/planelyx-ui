import { SelectOption } from '../../shared/util/enum-labels';

/** A small curated set of PrimeIcons that suit personal-finance categories. */
export const CATEGORY_ICON_OPTIONS: SelectOption<string>[] = [
  { label: 'Groceries', value: 'pi-shopping-cart', icon: 'pi-shopping-cart' },
  { label: 'Dining', value: 'pi-apple', icon: 'pi-apple' },
  { label: 'Home', value: 'pi-home', icon: 'pi-home' },
  { label: 'Transport', value: 'pi-car', icon: 'pi-car' },
  { label: 'Health', value: 'pi-heart', icon: 'pi-heart' },
  { label: 'Education', value: 'pi-book', icon: 'pi-book' },
  { label: 'Entertainment', value: 'pi-ticket', icon: 'pi-ticket' },
  { label: 'Travel', value: 'pi-send', icon: 'pi-send' },
  { label: 'Bills', value: 'pi-file', icon: 'pi-file' },
  { label: 'Salary', value: 'pi-briefcase', icon: 'pi-briefcase' },
  { label: 'Investments', value: 'pi-chart-line', icon: 'pi-chart-line' },
  { label: 'Gifts', value: 'pi-gift', icon: 'pi-gift' },
  { label: 'Subscriptions', value: 'pi-replay', icon: 'pi-replay' },
  { label: 'Shopping', value: 'pi-tag', icon: 'pi-tag' },
  { label: 'Savings', value: 'pi-wallet', icon: 'pi-wallet' },
  { label: 'Other', value: 'pi-circle', icon: 'pi-circle' },
];
