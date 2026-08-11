import { Location } from '@angular/common';
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import Keycloak from 'keycloak-js';

/** Blocks unauthenticated access and bounces to the Keycloak login page. */
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
