import type { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://api.planelyx.local/api',
  keycloak: {
    url: 'https://auth.planelyx.local',
    realm: 'planelyx',
    clientId: 'planelyx-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
};
