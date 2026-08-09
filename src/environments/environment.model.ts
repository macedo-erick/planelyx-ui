export interface Environment {
  readonly production: boolean;
  readonly apiUrl: string;
  readonly ocrUrl: string;
  readonly keycloak: {
    readonly url: string;
    readonly realm: string;
    readonly clientId: string;
  };
  readonly defaultCurrency: string;
  readonly defaultLocale: string;
  readonly primeUiLicense?: string;
}
