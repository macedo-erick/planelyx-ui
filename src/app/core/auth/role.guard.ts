import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** The realm role `planelyx-ocr` requires before it will move a feature flag. */
export const OCR_ADMIN_ROLE = 'ocr-admin';

/** Keeps an admin route out of the navigation of users who would only be refused by the server. */
export function requireRole(role: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.hasRole(role) ? true : router.createUrlTree(['/dashboard']);
  };
}
