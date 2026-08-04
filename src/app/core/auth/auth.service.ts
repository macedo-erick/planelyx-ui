import { Service, computed, inject, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

/** The subset of Keycloak ID-token claims the UI cares about. */
interface FintrackTokenClaims {
  readonly sub?: string;
  readonly name?: string;
  readonly preferred_username?: string;
  readonly given_name?: string;
  readonly email?: string;
}

@Service()
export class AuthService {
  private readonly keycloak = inject(Keycloak);

  /**
   * Keycloak mutates its own instance rather than emitting signals, so we snapshot the
   * claims once at construction. `provideKeycloak` finishes init before the app
   * bootstraps, so the token is already present here.
   */
  private readonly claims = signal<FintrackTokenClaims>(
    (this.keycloak.tokenParsed ?? {}) as FintrackTokenClaims,
  );

  readonly isAuthenticated = computed(() => this.keycloak.authenticated ?? false);

  /** The backend derives `owner_id` from this exact claim, so it is the user's identity. */
  readonly userId = computed(() => this.claims().sub ?? null);

  readonly username = computed(() => this.claims().preferred_username ?? '');

  readonly email = computed(() => this.claims().email ?? '');

  readonly displayName = computed(() => {
    const c = this.claims();
    return c.name || c.given_name || c.preferred_username || 'User';
  });

  /** Two-letter avatar fallback, e.g. "Demo User" -> "DU". */
  readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );

  login(redirectPath = '/'): void {
    void this.keycloak.login({ redirectUri: `${window.location.origin}${redirectPath}` });
  }

  logout(): void {
    void this.keycloak.logout({ redirectUri: window.location.origin });
  }

  openAccountManagement(): void {
    void this.keycloak.accountManagement();
  }
}
