import { IsoInstant, Uuid } from './common';
import { CategoryType } from './enums';

/** A category as the API holds it. */
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
