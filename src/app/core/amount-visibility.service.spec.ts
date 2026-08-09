import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AMOUNTS_HIDDEN_STORAGE_KEY, amountsHidden } from '../shared/util/amount-visibility';
import { AmountVisibilityService } from './amount-visibility.service';

describe('AmountVisibilityService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  afterEach(() => {
    amountsHidden.set(false);
    localStorage.removeItem(AMOUNTS_HIDDEN_STORAGE_KEY);
  });

  it('starts from whatever the formatters are already reading', () => {
    const service = TestBed.inject(AmountVisibilityService);

    expect(service.hidden()).toBe(amountsHidden());
  });

  it('toggles the signal the formatters read', () => {
    const service = TestBed.inject(AmountVisibilityService);

    service.toggle();
    expect(amountsHidden()).toBe(true);
    expect(service.hidden()).toBe(true);

    service.toggle();
    expect(amountsHidden()).toBe(false);
  });

  /**
   * The choice has to survive a reload, or hiding amounts lasts exactly as long as the tab —
   * the same bargain `ThemeService` and `LocaleService` strike under their `planelyx.*` keys.
   */
  it('persists the choice', () => {
    const service = TestBed.inject(AmountVisibilityService);

    service.toggle();
    TestBed.tick();

    expect(localStorage.getItem(AMOUNTS_HIDDEN_STORAGE_KEY)).toBe('true');
  });
});
