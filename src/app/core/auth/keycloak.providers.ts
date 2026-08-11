import { EnvironmentProviders, Provider } from '@angular/core';
import {
  AutoRefreshTokenService,
  createInterceptorCondition,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  IncludeBearerTokenCondition,
  provideKeycloak,
  UserActivityService,
  withAutoRefreshToken,
} from 'keycloak-angular';

import { environment } from '../../../environments/environment';

/** Escapes a literal string for safe embedding in a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The bearer token is attached only to requests whose URL starts with our own API base. */
const apiUrlCondition = createInterceptorCondition<IncludeBearerTokenCondition>({
  urlPattern: new RegExp(`^${escapeRegExp(environment.apiUrl)}(/.*)?$`, 'i'),
  bearerPrefix: 'Bearer',
});

/** The same for `planelyx-ocr`, which is a second service on a base URL of its own. */
const ocrUrlCondition = createInterceptorCondition<IncludeBearerTokenCondition>({
  urlPattern: new RegExp(`^${escapeRegExp(environment.ocrUrl)}(/.*)?$`, 'i'),
  bearerPrefix: 'Bearer',
});

/** The silent-SSO redirect is resolved against `<base href>` rather than the bare origin. */
export const provideKeycloakAuth = (): EnvironmentProviders =>
  provideKeycloak({
    config: {
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId,
    },
    initOptions: {
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: new URL('silent-check-sso.html', document.baseURI).href,
    },
    features: [
      withAutoRefreshToken({
        onInactivityTimeout: 'logout',
        sessionTimeout: 30 * 60 * 1000,
      }),
    ],
    providers: [AutoRefreshTokenService, UserActivityService],
  });

/** Provider that scopes the bearer-token interceptor to the Planelyx services, and nothing else. */
export const keycloakBearerTokenConfig: Provider = {
  provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  useValue: [apiUrlCondition, ocrUrlCondition],
};
