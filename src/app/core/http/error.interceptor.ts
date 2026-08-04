import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

import { normalizeApiError } from './api-error';

/**
 * Surfaces failed requests as a toast, then rethrows so callers can still react.
 *
 * 401 is skipped: keycloak-angular's auto-refresh handles expiry, and a toast on the way
 * to a login redirect is just noise.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        const normalized = normalizeApiError(error);
        messages.add({
          severity: 'error',
          summary: normalized.title,
          detail: normalized.detail,
          life: 6000,
        });
      }
      return throwError(() => error);
    }),
  );
};
