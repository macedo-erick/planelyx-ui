import type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'https://staging-api.fintrack.local/api',
  keycloak: {
    url: 'https://staging-auth.fintrack.local',
    realm: 'fintrack',
    clientId: 'fintrack-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
};
