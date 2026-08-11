import { effect, Service } from '@angular/core';

import { AMOUNTS_HIDDEN_STORAGE_KEY, amountsHidden } from '../shared/util/amount-visibility';

/** The one place the amount mask is toggled and persisted. */
@Service()
export class AmountVisibilityService {
  readonly hidden = amountsHidden.asReadonly();

  constructor() {
    effect(() => localStorage.setItem(AMOUNTS_HIDDEN_STORAGE_KEY, String(amountsHidden())));
  }

  toggle(): void {
    amountsHidden.update((hidden) => !hidden);
  }
}
