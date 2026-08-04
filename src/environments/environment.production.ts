import type { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://api.fintrack.local/api',
  keycloak: {
    url: 'https://auth.fintrack.local',
    realm: 'fintrack',
    clientId: 'fintrack-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
};
