import { computed, Signal } from '@angular/core';
import { translateObjectSignal } from '@jsverse/transloco';

import { SelectOption } from '../../shared/util/enum-labels';

/**
 * A small curated set of PrimeIcons that suit personal-finance categories.
 *
 * The icon is what is stored; the label only describes it in the picker, so it is translated
 * from `categories.groups` rather than saved anywhere.
 *
 * Every icon the API seeds its default categories with has to appear here. An icon missing from
 * this list leaves the picker blank on the category that uses it, which reads as "no icon" and
 * invites the user to save one away without meaning to. The dialog also keeps whatever is
 * already stored, so a value from outside this list survives an edit either way.
 */
const ICONS: readonly { readonly key: string; readonly icon: string }[] = [
  { key: 'Groceries', icon: 'pi-shopping-cart' },
  { key: 'Dining', icon: 'pi-shop' },
  { key: 'Home', icon: 'pi-home' },
  { key: 'Utilities', icon: 'pi-bolt' },
  { key: 'Transport', icon: 'pi-car' },
  { key: 'Health', icon: 'pi-heart-fill' },
  { key: 'Education', icon: 'pi-graduation-cap' },
  { key: 'Entertainment', icon: 'pi-video' },
  { key: 'Travel', icon: 'pi-map' },
  { key: 'Bills', icon: 'pi-file' },
  { key: 'Insurance', icon: 'pi-shield' },
  { key: 'Salary', icon: 'pi-wallet' },
  { key: 'Freelance', icon: 'pi-briefcase' },
  { key: 'Investments', icon: 'pi-chart-line' },
  { key: 'Gifts', icon: 'pi-gift' },
  { key: 'Subscriptions', icon: 'pi-sync' },
  { key: 'Shopping', icon: 'pi-shopping-bag' },
  { key: 'Savings', icon: 'pi-money-bill' },
  { key: 'Other', icon: 'pi-ellipsis-h' },
];

/** Must be called from an injection context — see the note in `enum-labels.ts`. */
export function categoryIconOptions(): Signal<SelectOption<string>[]> {
  const groups = translateObjectSignal('categories.groups');

  return computed(() => {
    const names = groups() as Record<string, string>;

    return ICONS.map(({ key, icon }) => ({ label: names[key] ?? key, value: icon, icon }));
  });
}
