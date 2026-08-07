import type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'https://staging-api.planelyx.local/api',
  keycloak: {
    url: 'https://staging-auth.planelyx.local/auth',
    realm: 'planelyx',
    clientId: 'planelyx-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
};
