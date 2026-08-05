import { computed, Signal } from '@angular/core';
import { translateObjectSignal } from '@jsverse/transloco';

import { SelectOption } from '../../shared/util/enum-labels';

/**
 * A small curated set of PrimeIcons that suit personal-finance categories.
 *
 * The icon is what is stored; the label only describes it in the picker, so it is translated
 * from `categories.groups` rather than saved anywhere.
 */
const ICONS: readonly { readonly key: string; readonly icon: string }[] = [
  { key: 'Groceries', icon: 'pi-shopping-cart' },
  { key: 'Dining', icon: 'pi-apple' },
  { key: 'Home', icon: 'pi-home' },
  { key: 'Transport', icon: 'pi-car' },
  { key: 'Health', icon: 'pi-heart' },
  { key: 'Education', icon: 'pi-book' },
  { key: 'Entertainment', icon: 'pi-ticket' },
  { key: 'Travel', icon: 'pi-send' },
  { key: 'Bills', icon: 'pi-file' },
  { key: 'Salary', icon: 'pi-briefcase' },
  { key: 'Investments', icon: 'pi-chart-line' },
  { key: 'Gifts', icon: 'pi-gift' },
  { key: 'Subscriptions', icon: 'pi-replay' },
  { key: 'Shopping', icon: 'pi-tag' },
  { key: 'Savings', icon: 'pi-wallet' },
  { key: 'Other', icon: 'pi-circle' },
];

/** Must be called from an injection context — see the note in `enum-labels.ts`. */
export function categoryIconOptions(): Signal<SelectOption<string>[]> {
  const groups = translateObjectSignal('categories.groups');

  return computed(() => {
    const names = groups() as Record<string, string>;

    return ICONS.map(({ key, icon }) => ({ label: names[key] ?? key, value: icon, icon }));
  });
}
