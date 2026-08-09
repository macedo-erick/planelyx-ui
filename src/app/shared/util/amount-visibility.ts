import { signal } from '@angular/core';

export const AMOUNTS_HIDDEN_STORAGE_KEY = 'planelyx.amountsHidden';

/**
 * Whether displayed amounts are masked, for reading over someone's shoulder or screen sharing.
 *
 * A plain signal rather than a service for the same reason as `currentLocale`: `formatMoney` is
 * a pure function called from templates, and reading a signal there is what re-renders every
 * amount when the toggle flips, with no subscription anywhere.
 *
 * `AmountVisibilityService` owns writing to it; nothing else should.
 *
 * Masking hides magnitudes, not the existence or direction of money. Sign-driven styling still
 * shows which way a figure points — a debit row renders `− R$ ••••` in red — and ratios such as
 * a credit card's used-limit bar and the dashboard chart's slice proportions stay visible.
 * Concealing those too would mean masking layout, which is a different feature.
 */
export const amountsHidden = signal(initialPreference());

/** Defaults to showing amounts: the mask is something you ask for, not something you opt out of. */
function initialPreference(): boolean {
  return localStorage.getItem(AMOUNTS_HIDDEN_STORAGE_KEY) === 'true';
}
