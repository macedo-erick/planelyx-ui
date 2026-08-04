/** Shape every environment file must satisfy. Keeps the variants from drifting apart. */
export interface Environment {
  readonly production: boolean;
  /** Base URL of the Fintrack API, including the `/api` prefix and no trailing slash. */
  readonly apiUrl: string;
  readonly keycloak: {
    /** Keycloak base URL, without `/realms/...`. */
    readonly url: string;
    readonly realm: string;
    readonly clientId: string;
  };
  /** ISO 4217 code used to pre-fill new bank accounts and to format money. */
  readonly defaultCurrency: string;
  /** BCP 47 tag used for number and date formatting. */
  readonly defaultLocale: string;
  /** PrimeUI Community/Commercial license key (primeng/config providePrimeNG). Dev-tier keys are env-specific. */
  readonly primeUiLicense?: string;
}
