import { effect, Service } from '@angular/core';

import { AMOUNTS_HIDDEN_STORAGE_KEY, amountsHidden } from '../shared/util/amount-visibility';

/**
 * The one place the amount mask is toggled and persisted.
 *
 * Modelled on `ThemeService`, down to persisting the choice under a `planelyx.*` key. Unlike
 * `LocaleService` it keeps no signal of its own — the formatters read `amountsHidden` directly,
 * and a second copy here would be a second source of truth to keep in step.
 */
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
