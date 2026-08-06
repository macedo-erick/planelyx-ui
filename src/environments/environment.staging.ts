import type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'https://staging-api.planelyx.local/api',
  keycloak: {
    // /auth like the other environments: the prefix is a build-time option baked into the
    // planelyx-auth image, so anything running that image serves under it.
    url: 'https://staging-auth.planelyx.local/auth',
    realm: 'planelyx',
    clientId: 'planelyx-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
};
