import { signal } from '@angular/core';

export const AMOUNTS_HIDDEN_STORAGE_KEY = 'planelyx.amountsHidden';

/** Whether displayed amounts are masked, for reading over someone's shoulder or screen sharing. */
export const amountsHidden = signal(initialPreference());

/** Defaults to showing amounts: the mask is something you ask for, not something you opt out of. */
function initialPreference(): boolean {
  return localStorage.getItem(AMOUNTS_HIDDEN_STORAGE_KEY) === 'true';
}
