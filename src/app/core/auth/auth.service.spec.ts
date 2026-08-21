import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import Keycloak from 'keycloak-js';
import { describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';
import { OCR_ADMIN_ROLE } from './role.guard';

/** Only the claims `AuthService` reads; the rest of Keycloak is never touched here. */
function withClaims(tokenParsed: unknown): AuthService {
  TestBed.configureTestingModule({
    providers: [
      provideLocationMocks(),
      { provide: Keycloak, useValue: { authenticated: true, tokenParsed } },
    ],
  });

  return TestBed.inject(AuthService);
}

describe('AuthService realm roles', () => {
  it('reads the realm roles the token carries', () => {
    const auth = withClaims({ sub: 'u1', realm_access: { roles: ['ocr-admin', 'default-roles'] } });

    expect(auth.hasRole(OCR_ADMIN_ROLE)).toBe(true);
  });

  it('grants nothing when the claim is absent', () => {
    const auth = withClaims({ sub: 'u1' });

    expect(auth.roles()).toEqual([]);
    expect(auth.hasRole(OCR_ADMIN_ROLE)).toBe(false);
  });

  it('grants nothing when the claim is not the shape it should be', () => {
    const auth = withClaims({ sub: 'u1', realm_access: { roles: 'ocr-admin' } });

    expect(auth.roles()).toEqual([]);
  });

  it('keeps only the entries that are actually role names', () => {
    const auth = withClaims({ sub: 'u1', realm_access: { roles: ['ocr-admin', 7, null] } });

    expect(auth.roles()).toEqual(['ocr-admin']);
  });
});
