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
    // The /auth prefix is not an nginx artefact: local dev now runs the same image production
    // does, and KC_HTTP_RELATIVE_PATH=/auth is baked into it. Dropping it here yields a 404 on
    // the OIDC discovery document rather than an obvious misconfiguration.
    url: 'http://localhost:8081/auth',
    realm: 'planelyx',
    clientId: 'planelyx-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
  primeUiLicense:
    'eyJpZCI6ImE0MmJjNTAyLWY4OTUtNGVmNi05ZTczLTFlOTc3ODYxN2E5YyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODU4MDY5MDYsImV4cCI6MTgxNzM0MjkwNn0.T5cOipxcy6E1I8jTBQaa3v3073YOytbhr2FkKKqV7HJOghFd6VCnItsxdXVkaFIbHP3V3i4iy-11eVMD0cZ0Bw',
};
