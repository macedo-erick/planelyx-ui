import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

/**
 * Loads a language file from `public/i18n/`.
 *
 * Resolved against `document.baseURI` rather than a root-absolute path: production serves the
 * app under `/ui/`, where `/i18n/pt-BR.json` would miss.
 */
@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(new URL(`i18n/${lang}.json`, document.baseURI).href);
  }
}
