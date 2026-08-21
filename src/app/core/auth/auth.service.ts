import { Location } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

/** The subset of Keycloak ID-token claims the UI cares about. */
interface PlanelyxTokenClaims {
  readonly sub?: string;
  readonly name?: string;
  readonly preferred_username?: string;
  readonly given_name?: string;
  readonly email?: string;
  readonly realm_access?: { readonly roles?: readonly unknown[] };
}

/** Hiding a control is a courtesy; every role is enforced again by the service that owns it. */
function realmRoles(claims: PlanelyxTokenClaims): readonly string[] {
  const roles = claims.realm_access?.roles;

  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === 'string')
    : [];
}

@Service()
export class AuthService {
  private readonly keycloak = inject(Keycloak);

  private readonly location = inject(Location);

  private readonly claims = signal<PlanelyxTokenClaims>(
    (this.keycloak.tokenParsed ?? {}) as PlanelyxTokenClaims,
  );

  readonly isAuthenticated = computed(() => this.keycloak.authenticated ?? false);

  readonly userId = computed(() => this.claims().sub ?? null);

  readonly roles = computed(() => realmRoles(this.claims()));

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  readonly username = computed(() => this.claims().preferred_username ?? '');

  readonly email = computed(() => this.claims().email ?? '');

  readonly displayName = computed(() => {
    const c = this.claims();
    return c.name || c.given_name || c.preferred_username || 'User';
  });

  readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );

  /** Re-reads the claims after the profile has been edited elsewhere. */
  async refreshClaims(): Promise<void> {
    await this.keycloak.updateToken(-1);
    this.claims.set((this.keycloak.tokenParsed ?? {}) as PlanelyxTokenClaims);
  }

  login(redirectPath = '/'): void {
    void this.keycloak.login({ redirectUri: this.absoluteUrl(redirectPath) });
  }

  logout(): void {
    void this.keycloak.logout({ redirectUri: this.absoluteUrl('/') });
  }

  /** Turns an app-relative route into an absolute URL that includes the base href. */
  private absoluteUrl(path: string): string {
    return `${window.location.origin}${this.location.prepareExternalUrl(path)}`;
  }

  openAccountManagement(): void {
    void this.keycloak.accountManagement();
  }
}
