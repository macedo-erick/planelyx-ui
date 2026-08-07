import { IsoInstant, Uuid } from './common';
import { CategoryType } from './enums';

/**
 * A category as the API holds it.
 *
 * `icon` is a PrimeIcons class name such as `pi-shopping-cart`, `color` a CSS token such as
 * `#3b82f6`; both are nullable.
 *
 * `system` is true for the categories the app owns rather than the user — the ones backing balance
 * and invoice corrections. They are not editable and not a valid choice on a transaction, so they
 * stay out of every picker, but they must still resolve by id so an existing correction can render
 * its name.
 */
export interface Category {
  readonly id: Uuid;
  readonly name: string;
  readonly type: CategoryType;
  readonly icon: string | null;
  readonly color: string | null;
  readonly system: boolean;
  readonly createdAt: IsoInstant;
}

export interface CategoryRequest {
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
}
