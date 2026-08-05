/**
 * Production environment — served from https://planelyx.com under a /ui/ base href.
 *
 * All three services share one origin, so API calls are same-origin and CORS never fires.
 * These values are baked in at build time: a different target needs a different build,
 * not just different container env vars.
 */
import type { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  // No trailing slash — this string is also compiled into the bearer-token interceptor's
  // regex in core/auth/keycloak.providers.ts.
  apiUrl: 'https://planelyx.com/api',
  keycloak: {
    // Must line up with KC_HTTP_RELATIVE_PATH=/auth so that tokens carry an `iss` of
    // https://planelyx.com/auth/realms/planelyx — the exact string the API validates.
    url: 'https://planelyx.com/auth',
    realm: 'planelyx',
    clientId: 'planelyx-api',
  },
  defaultCurrency: 'BRL',
  defaultLocale: 'pt-BR',
  // Community dev-tier key, same one as environment.ts. Swap this if you buy a tier —
  // leaving it unset makes providePrimeNG fall back to an unlicensed config.
  primeUiLicense:
    'eyJpZCI6ImE0MmJjNTAyLWY4OTUtNGVmNi05ZTczLTFlOTc3ODYxN2E5YyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODU4MDY5MDYsImV4cCI6MTgxNzM0MjkwNn0.T5cOipxcy6E1I8jTBQaa3v3073YOytbhr2FkKKqV7HJOghFd6VCnItsxdXVkaFIbHP3V3i4iy-11eVMD0cZ0Bw',
};
