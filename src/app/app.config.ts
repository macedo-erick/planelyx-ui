import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { includeBearerTokenInterceptor } from 'keycloak-angular';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { keycloakBearerTokenConfig, provideKeycloakAuth } from './core/auth/keycloak.providers';
import { errorInterceptor } from './core/http/error.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideKeycloakAuth(),
    keycloakBearerTokenConfig,
    // Order matters: the bearer interceptor must attach the token before the error
    // interceptor sees the response.
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
    MessageService,
    ConfirmationService,
  ],
};
