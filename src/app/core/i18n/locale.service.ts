import { effect, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PrimeNG } from 'primeng/config';

import {
  APP_LOCALES,
  AppLocale,
  currentLocale,
  LOCALE_STORAGE_KEY,
} from '../../shared/util/locale';
import { PRIMENG_TRANSLATIONS } from './primeng-translations';

/**
 * The one place a language change is applied.
 *
 * Four things have to move together or the page ends up half-translated: Transloco's active
 * language, the `Intl` locale behind every amount and date, PrimeNG's own component text, and
 * the document's `lang`. Keeping them in a single effect means adding a language later is one
 * edit rather than four.
 *
 * Modelled on `ThemeService`, down to persisting the choice under a `planelyx.*` key.
 */
@Service()
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly primeng = inject(PrimeNG);

  /** Seeded from the same resolution the formatters already used at module load. */
  readonly locale = signal<AppLocale>(currentLocale());

  readonly available = APP_LOCALES;

  constructor() {
    effect(() => {
      const locale = this.locale();

      this.transloco.load(locale).subscribe(() => this.transloco.setActiveLang(locale));

      currentLocale.set(locale);
      document.documentElement.lang = locale;
      this.primeng.setTranslation(PRIMENG_TRANSLATIONS[locale]);

      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    });
  }

  set(locale: AppLocale): void {
    this.locale.set(locale);
  }

  /** The language's own name, which is how a switcher should label it. */
  label(locale: AppLocale): string {
    return locale === 'pt-BR' ? 'Português' : 'English';
  }
}
