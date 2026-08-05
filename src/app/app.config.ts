import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { provideTransloco } from '@jsverse/transloco';
import { includeBearerTokenInterceptor } from 'keycloak-angular';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { keycloakBearerTokenConfig, provideKeycloakAuth } from './core/auth/keycloak.providers';
import { errorInterceptor } from './core/http/error.interceptor';
import { TranslatedTitleStrategy } from './core/i18n/translated-title.strategy';
import { TranslationLoader } from './core/i18n/translation-loader';
import { environment } from '../environments/environment';
import { APP_LOCALES, currentLocale } from './shared/util/locale';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideKeycloakAuth(),
    keycloakBearerTokenConfig,
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor, errorInterceptor])),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      license: environment.primeUiLicense,
    }),
    provideTransloco({
      config: {
        availableLangs: [...APP_LOCALES],
        // Already resolved from storage or the browser, so the first paint is in the right
        // language rather than flashing the default and correcting itself.
        defaultLang: currentLocale(),
        fallbackLang: 'en-US',
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: TranslationLoader,
    }),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    MessageService,
    ConfirmationService,
  ],
};
