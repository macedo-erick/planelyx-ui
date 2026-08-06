import { IsoInstant, Uuid } from './common';
import { CategoryType } from './enums';

export interface Category {
  readonly id: Uuid;
  readonly name: string;
  readonly type: CategoryType;
  /** PrimeIcons class name, e.g. `pi-shopping-cart`. Nullable. */
  readonly icon: string | null;
  /** CSS colour token, e.g. `#3b82f6`. Nullable. */
  readonly color: string | null;
  /**
   * True for the categories the app owns rather than the user — the ones backing balance and
   * invoice corrections. They are not editable and not a valid choice on a transaction, so they
   * stay out of every picker, but they must still resolve by id so an existing correction can
   * render its name.
   */
  readonly system: boolean;
  readonly createdAt: IsoInstant;
}

export interface CategoryRequest {
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
}
