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
  readonly createdAt: IsoInstant;
}

export interface CategoryRequest {
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
}
