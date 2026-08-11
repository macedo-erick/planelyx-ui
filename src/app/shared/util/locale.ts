import { signal } from '@angular/core';

import { environment } from '../../../environments/environment';

export type AppLocale = 'pt-BR' | 'en-US';

export const APP_LOCALES: readonly AppLocale[] = ['pt-BR', 'en-US'];

export const LOCALE_STORAGE_KEY = 'planelyx.locale';

/** The locale every `Intl` call in the app formats against. */
export const currentLocale = signal<AppLocale>(initialLocale());

document.documentElement.lang = currentLocale();

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale);
}

/** Resolved at module load, so the first amount formatted is already in the right locale. */
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
