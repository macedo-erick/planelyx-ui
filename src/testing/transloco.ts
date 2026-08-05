import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../public/i18n/en-US.json';
import { APP_LOCALES } from '../app/shared/util/locale';

/**
 * Transloco wired up for a `TestBed`, loaded with the real English file.
 *
 * Using the shipped translations rather than stubs means a test asserting on a label fails
 * when that key is renamed or dropped, which is the failure worth catching. Both languages
 * point at the same file — a test should not depend on which one is active.
 */
export function provideTestingTransloco() {
  return TranslocoTestingModule.forRoot({
    langs: Object.fromEntries(APP_LOCALES.map((lang) => [lang, en])),
    translocoConfig: { availableLangs: [...APP_LOCALES], defaultLang: 'en-US' },
    preloadLangs: true,
  });
}
