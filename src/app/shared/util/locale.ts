import { signal } from '@angular/core';

import { environment } from '../../../environments/environment';

export type AppLocale = 'pt-BR' | 'en-US';

export const APP_LOCALES: readonly AppLocale[] = ['pt-BR', 'en-US'];

export const LOCALE_STORAGE_KEY = 'planelyx.locale';

/**
 * The locale every `Intl` call in the app formats against.
 *
 * A plain signal rather than a service so the formatting helpers can stay pure functions —
 * they are called from templates, and reading a signal there is what makes every amount and
 * date re-render when the language changes, with no subscription anywhere.
 *
 * `LocaleService` owns writing to it; nothing else should.
 */
export const currentLocale = signal<AppLocale>(initialLocale());

// Set here rather than only in LocaleService: that service is constructed by the shell, which
// sits behind the auth guard, so the document would otherwise claim the wrong language for as
// long as sign-in takes.
document.documentElement.lang = currentLocale();

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale);
}

/**
 * Resolved at module load, not on first render, so the very first amount formatted is already
 * in the right locale.
 *
 * A stored choice wins, then the browser's preference, then the environment's default. The
 * browser is matched on its language subtag, so `pt`, `pt-PT` and `pt-BR` all land on Brazilian
 * Portuguese rather than falling through to English.
 */
function initialLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isAppLocale(stored)) {
    return stored;
  }

  const preferred = navigator.language?.split('-')[0]?.toLowerCase();
  const matched = APP_LOCALES.find((locale) => locale.split('-')[0] === preferred);
  if (matched) {
    return matched;
  }

  return isAppLocale(environment.defaultLocale) ? environment.defaultLocale : 'en-US';
}
