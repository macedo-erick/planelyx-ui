import { HttpParams } from '@angular/common/http';

/**
 * Builds `HttpParams` from a filter object, dropping null/undefined/empty entries so an
 * unset filter never reaches the API as `?from=`.
 */
export function toHttpParams(
  filters: Record<string, string | number | boolean | null | undefined>,
): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
