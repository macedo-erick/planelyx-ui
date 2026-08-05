import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';
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
  // TranslocoService directly rather than `injectTranslate()`: this runs once per request, and
  // that helper opens a language subscription bound to the root injector — one per request,
  // never released. A toast is read once and never re-rendered, so it gains nothing from it.
  const transloco = inject(TranslocoService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        const normalized = normalizeApiError(error);
        messages.add({
          severity: 'error',
          summary: transloco.translate(normalized.titleKey),
          // The server's own wording when it sent any; otherwise our generic fallback.
          detail: normalized.detailKey
            ? transloco.translate(normalized.detailKey)
            : normalized.detail,
          life: 6000,
        });
      }
      return throwError(() => error);
    }),
  );
};
