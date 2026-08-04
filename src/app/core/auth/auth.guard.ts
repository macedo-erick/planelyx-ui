import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import Keycloak from 'keycloak-js';

/**
 * Blocks unauthenticated access and bounces to the Keycloak login page, preserving the
 * URL the user was aiming for.
 *
 * Synchronous by design: `provideKeycloak` runs its init as an app initializer, so
 * `authenticated` is already settled by the time any route is activated.
 *
 * The realm defines no roles and the API has no role checks, so authentication is the
 * only gate — do not add role-based branches here without adding them server-side first.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const keycloak = inject(Keycloak);

  if (keycloak.authenticated) {
    return true;
  }

  void keycloak.login({ redirectUri: `${window.location.origin}${state.url}` });
  return false;
};
