/**
 * Development environment (the default — no file replacement applied).
 *
 * Swap targets without touching code:
 *   yarn start              -> this file
 *   yarn start:staging      -> environment.staging.ts
 *   yarn start:production   -> environment.production.ts
 */
import type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  keycloak: {
    url: 'http://localhost:8081',
    realm: 'fintrack',
    clientId: 'fintrack-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
  primeUiLicense:
    'eyJpZCI6ImE0MmJjNTAyLWY4OTUtNGVmNi05ZTczLTFlOTc3ODYxN2E5YyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODU4MDY5MDYsImV4cCI6MTgxNzM0MjkwNn0.T5cOipxcy6E1I8jTBQaa3v3073YOytbhr2FkKKqV7HJOghFd6VCnItsxdXVkaFIbHP3V3i4iy-11eVMD0cZ0Bw'
};
