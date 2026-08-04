import { HttpErrorResponse } from '@angular/common/http';

/**
 * The backend's `ApiError` record. Only `NotFoundException` (404) and
 * `IllegalArgument`/`IllegalState`/bean-validation (400) flow through
 * `GlobalExceptionHandler` — 401s, 500s and malformed-body errors fall through to
 * Spring's default shape, so this type is never guaranteed on the wire.
 */
export interface ApiError {
  readonly timestamp: string;
  readonly status: number;
  readonly error: string;
  readonly message: string;
}

/** A shape the UI can always rely on, whichever error shape actually arrived. */
export interface NormalizedApiError {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  /**
   * Bean-validation failures arrive as `"field: msg; field2: msg2"`. Split out so a form
   * can map them back onto individual fields.
   */
  readonly fieldErrors: ReadonlyMap<string, string>;
}

const GENERIC_DETAIL = 'Something went wrong. Please try again.';

function parseFieldErrors(message: string): ReadonlyMap<string, string> {
  const result = new Map<string, string>();

  // Only treat it as a field list when every segment looks like "name: message".
  const segments = message
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return result;
  }

  for (const segment of segments) {
    const separator = segment.indexOf(':');
    if (separator <= 0) {
      return new Map();
    }
    const field = segment.slice(0, separator).trim();
    const detail = segment.slice(separator + 1).trim();
    // Field names are Java identifiers; anything else is prose that happens to contain a colon.
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field) || !detail) {
      return new Map();
    }
    result.set(field, detail);
  }

  return result;
}

function titleFor(status: number, fallback: string): string {
  switch (status) {
    case 0:
      return 'Cannot reach the server';
    case 400:
      return 'Invalid data';
    case 401:
      return 'Session expired';
    case 403:
      return 'Not allowed';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    default:
      return fallback || (status >= 500 ? 'Server error' : 'Request failed');
  }
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, title: 'Unexpected error', detail: GENERIC_DETAIL, fieldErrors: new Map() };
  }

  // status 0 means the request never landed — network down, or a CORS preflight rejection.
  if (error.status === 0) {
    return {
      status: 0,
      title: titleFor(0, ''),
      detail: 'Check that the API is running and that CORS allows this origin.',
      fieldErrors: new Map(),
    };
  }

  const body = error.error as Partial<ApiError> | string | null;
  const message =
    typeof body === 'string'
      ? body
      : typeof body?.message === 'string'
        ? body.message
        : error.message;

  const fieldErrors = error.status === 400 ? parseFieldErrors(message) : new Map<string, string>();

  return {
    status: error.status,
    title: titleFor(error.status, typeof body === 'object' ? (body?.error ?? '') : ''),
    detail: fieldErrors.size > 0 ? [...fieldErrors.values()].join(', ') : message || GENERIC_DETAIL,
    fieldErrors,
  };
}
