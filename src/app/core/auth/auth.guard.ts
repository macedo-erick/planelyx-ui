import { Location } from '@angular/common';
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
 *
 * `state.url` is base-href-relative ('/dashboard'), but Keycloak needs an absolute URI that
 * matches a registered redirect URI. Production serves the app under /ui/, so the base href
 * has to be folded back in — `${origin}${state.url}` would produce an unregistered
 * '/dashboard' and Keycloak would reject the login.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const keycloak = inject(Keycloak);
  const appLocation = inject(Location);

  if (keycloak.authenticated) {
    return true;
  }

  void keycloak.login({
    redirectUri: `${window.location.origin}${appLocation.prepareExternalUrl(state.url)}`,
  });
  return false;
};
