import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, throwError } from 'rxjs';

import { normalizeApiError } from './api-error';

/** Set by callers that report their own failures, so one problem is not announced twice. */
const SKIP_ERROR_TOAST = new HttpContextToken(() => false);

export function skipErrorToast(): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST, true);
}

/** Surfaces failed requests as a toast, then rethrows so callers can still react. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);
  const transloco = inject(TranslocoService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        !req.context.get(SKIP_ERROR_TOAST) &&
        (!(error instanceof HttpErrorResponse) || error.status !== 401)
      ) {
        const normalized = normalizeApiError(error);
        messages.add({
          severity: 'error',
          summary: transloco.translate(normalized.titleKey),
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
